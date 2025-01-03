const crypto = require('node:crypto'),
  debug = require('debug'),
  minimatch = require('minimatch'),
  path = require('node:path');

/**
 * @import {Encoding, HashedElement, Options, RuleFn, RuleOption} from './types/public';
 * @import {InnerOptions, MatchRules, ParsedArgs} from './types/internal';
 */

/**
 * @type {Options}
 */
const defaultOptions = {
  algo: 'sha1', // see crypto.getHashes() for options
  algoOptions: undefined,
  encoding: 'base64url', // 'base64', 'base64url', 'hex' or 'binary'
  files: {
    exclude: [],
    include: [],
    matchBasename: true,
    matchPath: false,
    ignoreBasename: false,
    ignoreRootName: false,
  },
  folders: {
    exclude: [],
    include: [],
    matchBasename: true,
    matchPath: false,
    ignoreBasename: false,
    ignoreRootName: false,
  },
  symbolicLinks: {
    include: true,
    ignoreBasename: false,
    ignoreTargetPath: true,
    ignoreTargetContent: false,
    ignoreTargetContentAfterError: false,
  },
};

// Use the environment variable DEBUG to log output, e.g. `set DEBUG=fhash:*`
const log = {
  match: debug('fhash:match'),
  params: (/** @type {any} */ params) => {
    debug('fhash:parameters')(params);
    return params;
  },
  err: debug('fhash:err'),
  symlink: debug('fhash:symlink'),
  queue: debug('fhash:queue'),
  glob: debug('fhash:glob'),
};

/**
 * @param {typeof import("node:fs")} fs
 */
function prep(fs) {
  /**
   * @type {(() => any)[]}
   */
  let queue = [];
  /**
   * @type {NodeJS.Timeout | undefined}
   */
  let queueTimer = undefined;

  /**
   * @param {string} name
   * @param {string} dir
   * @param {Options} options
   * @param {(err?: Error, ok?: unknown) => void} callback
   */
  function hashElement(name, dir, options, callback) {
    callback = arguments[arguments.length - 1];

    return parseParameters(arguments)
      .then(({ basename, dir, options }) => {
        // this is only used for the root level
        options.skipMatching = true;
        return fs.promises
          .lstat(path.join(dir, basename))
          .then(stats => hashElementPromise(basename, stats, dir, options, true));
      })
      .then(result => {
        if (isFunction(callback)) {
          return callback(undefined, result);
        } else {
          return result;
        }
      })
      .catch(reason => {
        log.err('Fatal error:', reason);
        if (isFunction(callback)) {
          return callback(reason);
        } else {
          throw reason;
        }
      });
  }

  /**
   * @param {string} name
   * @param {import('node:fs').Stats} stats
   * @param {string} dirname
   * @param {InnerOptions} options
   * @param {boolean} isRootElement
   * @returns {Promise<HashedElement>}
   */
  function hashElementPromise(name, stats, dirname, options, isRootElement = false) {
    let promise = undefined;
    if (stats.isDirectory()) {
      promise = hashFolderPromise(name, dirname, options, isRootElement);
    } else if (stats.isFile()) {
      promise = hashFilePromise(name, dirname, options, isRootElement);
    } else if (stats.isSymbolicLink()) {
      promise = hashSymLinkPromise(name, dirname, options, isRootElement);
    } else {
      log.err('hashElementPromise cannot handle ', stats);
      return Promise.resolve({ name, hash: 'Error: unknown element type' });
    }

    return promise.catch((/** @type {{ code: string; }} */ err) => {
      if (err.code && (err.code === 'EMFILE' || err.code === 'ENFILE')) {
        log.queue(`queued ${dirname}/${name} because of ${err.code}`);

        const promise = new Promise((resolve, reject) => {
          queue.push(() => {
            log.queue(`Will processs queued ${dirname}/${name}`);
            return hashElementPromise(name, stats, dirname, options, isRootElement)
              .then((/** @type {any} */ ok) => resolve(ok))
              .catch((/** @type {any} */ err) => reject(err));
          });
        });

        if (queueTimer === undefined) {
          queueTimer = setTimeout(processQueue, 0);
        }
        return promise;
      }

      throw err;
    });
  }

  function processQueue() {
    queueTimer = undefined;
    const runnables = queue;
    queue = [];
    runnables.forEach(run => run());
  }

  /**
   * @param {string} name
   * @param {string} dir
   * @param {InnerOptions} options
   * @returns {Promise<HashedFolder|undefined>}
   */
  async function hashFolderPromise(name, dir, options, isRootElement = false) {
    const folderPath = path.join(dir, name);
    let ignoreBasenameOnce = options.ignoreBasenameOnce;
    delete options.ignoreBasenameOnce;

    if (options.skipMatching) {
      // this is currently only used for the root folder
      log.match(`skipped '${folderPath}'`);
      delete options.skipMatching;
    } else if (ignore(name, folderPath, options.folders)) {
      return undefined;
    }

    const files = await fs.promises.readdir(folderPath, { withFileTypes: true });
    const children = await Promise.all(
      files
        .sort((/** @type {{ name: string; }} */ a, /** @type {{ name: any; }} */ b) =>
          a.name.localeCompare(b.name),
        )
        .map((/** @type {any} */ child) =>
          hashElementPromise(child.name, child, folderPath, options),
        ),
    );

    if (ignoreBasenameOnce) options.ignoreBasenameOnce = true;
    const hash = new HashedFolder(name, children.filter(notUndefined), options, isRootElement);
    return hash;
  }

  /**
   * @param {string} name
   * @param {string} dir
   * @param {InnerOptions} options
   * @returns {Promise<HashedFile|undefined>}
   */
  function hashFilePromise(name, dir, options, isRootElement = false) {
    const filePath = path.join(dir, name);

    if (options.skipMatching) {
      // this is currently only used for the root folder
      log.match(`skipped '${filePath}'`);
      delete options.skipMatching;
    } else if (ignore(name, filePath, options.files)) {
      return Promise.resolve(undefined);
    }

    return new Promise((resolve, reject) => {
      try {
        const hash = crypto.createHash(options.algo, options.algoOptions);
        if (
          options.files.ignoreBasename ||
          options.ignoreBasenameOnce ||
          (isRootElement && options.files.ignoreRootName)
        ) {
          delete options.ignoreBasenameOnce;
          log.match(`omitted name of ${filePath} from hash`);
        } else {
          hash.update(name);
        }

        const f = fs.createReadStream(filePath);
        f.on('error', (/** @type {any} */ err) => {
          reject(err);
        });
        f.pipe(hash, { end: false });

        f.on('end', () => {
          const hashedFile = new HashedFile(name, hash, options.encoding);
          return resolve(hashedFile);
        });
      } catch (ex) {
        return reject(ex);
      }
    });
  }

  /**
   * @param {string} name
   * @param {string} dir
   * @param {InnerOptions} options
   * @param {boolean} isRootElement
   *
   * @returns {Promise<HashedFile|undefined>}
   */
  async function hashSymLinkPromise(name, dir, options, isRootElement = false) {
    const target = await fs.promises.readlink(path.join(dir, name));
    log.symlink(`handling symbolic link ${name} -> ${target}`);
    if (options.symbolicLinks.include) {
      if (options.symbolicLinks.ignoreTargetContent) {
        return symLinkIgnoreTargetContent(name, target, options, isRootElement);
      } else {
        return symLinkResolve(name, dir, target, options, isRootElement);
      }
    } else {
      log.symlink('skipping symbolic link');
      return Promise.resolve(undefined);
    }
  }

  /**
   * @param {string} name
   * @param {crypto.BinaryLike} target
   * @param {InnerOptions} options
   * @param {boolean} isRootElement
   *
   * @returns {Promise<HashedFile>}
   */
  function symLinkIgnoreTargetContent(name, target, options, isRootElement) {
    delete options.skipMatching; // only used for the root level
    log.symlink('ignoring symbolic link target content');
    const hash = crypto.createHash(options.algo, options.algoOptions);
    if (!options.symbolicLinks.ignoreBasename && !(isRootElement && options.files.ignoreRootName)) {
      log.symlink('hash basename');
      hash.update(name);
    }
    if (!options.symbolicLinks.ignoreTargetPath) {
      log.symlink('hash targetpath');
      hash.update(target);
    }
    return Promise.resolve(new HashedFile(name, hash, options.encoding));
  }

  /**
   * @param {string} name
   * @param {string} dir
   * @param {crypto.BinaryLike} target
   * @param {InnerOptions} options
   * @param {boolean} isRootElement
   *
   * @returns {Promise<HashedFile>}
   */
  async function symLinkResolve(name, dir, target, options, isRootElement) {
    delete options.skipMatching; // only used for the root level
    if (options.symbolicLinks.ignoreBasename) {
      options.ignoreBasenameOnce = true;
    }

    try {
      const stats = await fs.promises.stat(path.join(dir, name));
      const temp = await hashElementPromise(name, stats, dir, options, isRootElement);

      if (!options.symbolicLinks.ignoreTargetPath) {
        const hash = crypto.createHash(options.algo, options.algoOptions);
        hash.update(temp.hash);
        log.symlink('hash targetpath');
        hash.update(target);
        temp.hash = hash.digest(options.encoding);
      }
      return temp;
    } catch (err) {
      if (options.symbolicLinks.ignoreTargetContentAfterError) {
        log.symlink(`Ignoring error when hashing symbolic link ${name}`, err);
        const hash = crypto.createHash(options.algo, options.algoOptions);
        if (
          !options.symbolicLinks.ignoreBasename &&
          !(isRootElement && options.files.ignoreRootName)
        ) {
          hash.update(name);
        }
        if (!options.symbolicLinks.ignoreTargetPath) {
          hash.update(target);
        }
        return new HashedFile(name, hash, options.encoding);
      } else {
        log.symlink(`Fatal error when hashing symbolic link ${name}`, err);
        throw err;
      }
    }
  }

  /**
   * @param {string} name
   * @param {string} path
   * @param {MatchRules} rules
   */
  function ignore(name, path, rules) {
    if (rules.exclude) {
      if (rules.matchBasename && rules.exclude(name)) {
        log.match(`exclude basename '${name}'`);
        return true;
      } else if (rules.matchPath && rules.exclude(path)) {
        log.match(`exclude path '${path}'`);
        return true;
      }
    }
    if (rules.include) {
      if (rules.matchBasename && rules.include(name)) {
        log.match(`include basename '${name}'`);
        return false;
      } else if (rules.matchPath && rules.include(path)) {
        log.match(`include path '${path}'`);
        return false;
      } else {
        log.match(`include rule failed for path '${path}'`);
        return true;
      }
    }

    log.match(`Will not ignore unmatched '${path}'`);
    return false;
  }

  return hashElement;
}

/**
 * @param {IArguments | Array<string|Options>} args
 * @returns {Promise<ParsedArgs>}
 */
function parseParameters(args) {
  let basename = args[0],
    dir = args[1],
    options = args[2];

  if (!isString(basename)) {
    return Promise.reject(new TypeError('First argument must be a string'));
  }

  if (!isString(dir)) {
    dir = path.dirname(basename);
    basename = path.basename(basename);
    options = args[1];
  }

  /** @type {Options} */
  let combined;

  if (options && typeof options === 'object') {
    combined = {
      algo: 'algo' in options ? options.algo : defaultOptions.algo,
      algoOptions: 'algoOptions' in options ? options.algoOptions : defaultOptions.algoOptions,
      encoding: 'encoding' in options ? options.encoding : defaultOptions.encoding,
      // files: { ...structuredClone(defaultOptions.files), ...options.files },
      files:
        'files' in options
          ? { ...structuredClone(defaultOptions.files), ...options.files }
          : structuredClone(defaultOptions.files),
      folders:
        'folders' in options
          ? { ...structuredClone(defaultOptions.folders), ...options.folders }
          : structuredClone(defaultOptions.folders),
      symbolicLinks: {
        ...structuredClone(defaultOptions.symbolicLinks),
        ...options.symbolicLinks,
      },
    };
  } else {
    combined = structuredClone(defaultOptions);
  }

  /** @type {InnerOptions} */
  const inner = {
    ...combined,
    files: {
      ...combined.files,
      exclude: reduceGlobPatterns(combined.files.exclude, 'exclude files'),
      include: reduceGlobPatterns(combined.files.include, 'include files'),
    },
    folders: {
      ...combined.folders,
      exclude: reduceGlobPatterns(combined.folders.exclude, 'exclude folders'),
      include: reduceGlobPatterns(combined.folders.include, 'include folders'),
    },
    skipMatching: false,
    ignoreBasenameOnce: false,
  };

  return Promise.resolve(log.params({ basename, dir, options: inner }));
}

const HashedFolder = function HashedFolder(
  /** @type {string} */ name,
  /** @type {HashedElement[]} */ children,
  /** @type {InnerOptions} */ options,
  isRootElement = false,
) {
  this.name = name;
  this.children = children;

  const hash = crypto.createHash(options.algo, options.algoOptions);
  if (
    options.folders.ignoreBasename ||
    options.ignoreBasenameOnce ||
    (isRootElement && options.folders.ignoreRootName)
  ) {
    delete options.ignoreBasenameOnce;
    log.match(`omitted name of folder ${name} from hash`);
  } else {
    hash.update(name);
  }
  children.forEach((/** @type {{ hash: crypto.BinaryLike; }} */ child) => {
    if (child.hash) {
      hash.update(child.hash);
    }
  });

  this.hash = hash.digest(options.encoding);
};

HashedFolder.prototype.toString = function (padding = '') {
  const first = `${padding}{ name: '${this.name}', hash: '${this.hash}',\n`;
  padding += '  ';

  return `${first}${padding}children: ${this.childrenToString(padding)}}`;
};

HashedFolder.prototype.childrenToString = function (padding = '') {
  if (this.children.length === 0) {
    return '[]';
  } else {
    const nextPadding = padding + '  ';
    const children = this.children
      .map((/** @type {{ toString: (arg0: string) => any; }} */ child) =>
        child.toString(nextPadding),
      )
      .join('\n');
    return `[\n${children}\n${padding}]`;
  }
};

const HashedFile = function HashedFile(
  /** @type {string} */ name,
  /** @type {crypto.Hash} */ hash,
  /** @type {Encoding} */ encoding,
) {
  this.name = name;
  this.hash = hash.digest(encoding);
};

HashedFile.prototype.toString = function (padding = '') {
  return padding + "{ name: '" + this.name + "', hash: '" + this.hash + "' }";
};

/**
 * @param {unknown} any
 */
function isFunction(any) {
  return typeof any === 'function';
}

/**
 * @param {unknown} str
 */
function isString(str) {
  return typeof str === 'string';
}

/**
 * @param {unknown} obj
 */
function isObject(obj) {
  return obj !== null && typeof obj === 'object';
}

/**
 * @param {unknown} obj
 */
function notUndefined(obj) {
  return typeof obj !== 'undefined';
}

/**
 * @param {RuleOption} globs
 * @param {string} name
 * @returns {RuleFn|undefined}
 */
function reduceGlobPatterns(globs, name) {
  if (isFunction(globs)) {
    log.glob(`Using function to ${name}`);
    return globs;
  } else if (!globs || !Array.isArray(globs) || globs.length === 0) {
    log.glob(`Invalid glob pattern to ${name}`, { globs, typeof: typeof globs });
    return undefined;
  } else {
    // combine globs into one single RegEx
    const regex = new RegExp(
      globs
        .reduce((acc, exclude) => {
          const built = minimatch.makeRe(exclude);
          if (!built) return acc;
          else return acc + '|' + built.source;
        }, '')
        .substr(1),
    );
    log.glob(`Reduced glob patterns to ${name}`, { from: globs, to: regex });
    return (/** @type {string} */ param) => regex.test(param);
  }
}

module.exports = {
  defaults: defaultOptions,
  hashElement: prep(require('node:fs')),
  // exposed for testing
  prep,
  parseParameters,
};
