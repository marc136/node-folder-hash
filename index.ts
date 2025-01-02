﻿import * as crypto from 'crypto';
import debug from 'debug'
import {minimatch} from 'minimatch'
import * as path from 'path'
import type * as fsModule from 'fs'

const defaultOptions = {
  algo: 'sha1', // see crypto.getHashes() for options
  encoding: 'base64', // 'base64', 'base64url', 'hex' or 'binary'
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
  params: params => {
    debug('fhash:parameters')(params);
    return params;
  },
  err: debug('fhash:err'),
  symlink: debug('fhash:symlink'),
  queue: debug('fhash:queue'),
};

type HashedEntity = HashedFolder | HashedFile

interface MatchOptions {
  exclude: string[]
  include: string[]
  matchBasename: boolean
  matchPath: boolean
  ignoreBasename: boolean
  ignoreRootName: boolean
}
type Options = {
  skipMatching: boolean
  algo: string
  encoding: crypto.BinaryToTextEncoding
  ignoreBasenameOnce?: boolean
  files: MatchOptions
  folders: MatchOptions
  symbolicLinks: {
    include: boolean
    ignoreBasename: boolean
    ignoreTargetPath: boolean
    ignoreTargetContent: boolean
    ignoreTargetContentAfterError: boolean
  }
}
type Callback = (err: Error, result?: HashedEntity) => void

export function prep(fs: typeof fsModule) {
  let queue = [];
  let queueTimer = undefined;

  function hashElement(name: string, options?: Options, callback?: Callback): Promise<HashedEntity>;
  function hashElement(name: string, dir: string, callback?: Callback): Promise<HashedEntity>;
  function hashElement(name: string, dir: string, options?: Options, callback?: Callback): Promise<HashedEntity>;
  function hashElement(name: string, dir: string | Options, options?: Options | Callback, callback?: Callback): Promise<HashedEntity | void> {
    callback = arguments[arguments.length - 1];
    const base = name;

    return parseParameters(arguments)
      .then(({ basename, dir, options }) => {
        // this is only used for the root level
        options.skipMatching = true;
        return fs.promises
          .lstat(path.join(dir, basename))
          .then(stats => {
            // @ts-expect-error
            stats.name = basename
            return stats;
          })
          .then((stats: fsModule.Stats & {name: string}) => hashElementPromise(stats, dir, base, options, true));
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
   * @param {fs.Stats} stats folder element, can also be of type fs.Dirent
   * @param {string} dirname
   * @param {string} base
   * @param {Options} options
   * @param {boolean} isRootElement
   */
  function hashElementPromise(stats: (fsModule.Stats & {name: string}) | fsModule.Dirent, dirname: string, base: string, options: Options, isRootElement = false): Promise<HashedEntity> {
    const name = stats.name;
    let promise = undefined;
    if (stats.isDirectory()) {
      promise = hashFolderPromise(name, dirname, base, options, isRootElement);
    } else if (stats.isFile()) {
      promise = hashFilePromise(name, dirname, base, options, isRootElement);
    } else if (stats.isSymbolicLink()) {
      promise = hashSymLinkPromise(name, dirname, base, options, isRootElement);
    } else {
      log.err('hashElementPromise cannot handle ', stats);
      return Promise.resolve({ name, hash: 'Error: unknown element type' });
    }

    return promise.catch(err => {
      if (err.code && (err.code === 'EMFILE' || err.code === 'ENFILE')) {
        log.queue(`queued ${dirname}/${name} because of ${err.code}`);

        const promise = new Promise((resolve, reject) => {
          queue.push(() => {
            log.queue(`Will processs queued ${dirname}/${name}`);
            return hashElementPromise(stats, dirname, base, options, isRootElement)
              .then(ok => resolve(ok))
              .catch(err => reject(err));
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

  async function hashFolderPromise(name: string, dir: string, base: string, options: Options, isRootElement = false) {
    const folderPath = path.join(dir, name);
    let ignoreBasenameOnce = options.ignoreBasenameOnce;
    delete options.ignoreBasenameOnce;

    if (options.skipMatching) {
      // this is currently only used for the root folder
      log.match(`skipped '${folderPath}'`);
      delete options.skipMatching;
    } else if (ignore(name, folderPath, base, options.folders)) {
      return undefined;
    }

    const files = await fs.promises.readdir(folderPath, { withFileTypes: true });
    const children = await Promise.all(
      files
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(child => hashElementPromise(child, folderPath, base, options)),
    );

    if (ignoreBasenameOnce) options.ignoreBasenameOnce = true;
    const hash = new HashedFolder(name, children.filter(notUndefined), options, isRootElement);
    return hash;
  }

  function hashFilePromise(name: string, dir: string, base: string, options: Options, isRootElement = false) {
    const filePath = path.join(dir, name);

    if (options.skipMatching) {
      // this is currently only used for the root folder
      log.match(`skipped '${filePath}'`);
      delete options.skipMatching;
    } else if (ignore(name, filePath, base, options.files)) {
      return Promise.resolve(undefined);
    }

    return new Promise((resolve, reject) => {
      try {
        const hash = crypto.createHash(options.algo);
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
        f.on('error', err => {
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

  async function hashSymLinkPromise(name: string, dir: string, base: string, options: Options, isRootElement = false) {
    const target = await fs.promises.readlink(path.join(dir, name));
    log.symlink(`handling symbolic link ${name} -> ${target}`);
    if (options.symbolicLinks.include) {
      if (options.symbolicLinks.ignoreTargetContent) {
        return symLinkIgnoreTargetContent(name, target, options, isRootElement);
      } else {
        return symLinkResolve(name, dir, base, target, options, isRootElement);
      }
    } else {
      log.symlink('skipping symbolic link');
      return Promise.resolve(undefined);
    }
  }

  function symLinkIgnoreTargetContent(name, target, options: Options, isRootElement) {
    delete options.skipMatching; // only used for the root level
    log.symlink('ignoring symbolic link target content');
    const hash = crypto.createHash(options.algo);
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

  async function symLinkResolve(name, dir, base, target, options, isRootElement) {
    delete options.skipMatching; // only used for the root level
    if (options.symbolicLinks.ignoreBasename) {
      options.ignoreBasenameOnce = true;
    }

    try {
      const stats = await fs.promises.stat(path.join(dir, name)) as fsModule.Stats & {name: string};
      stats.name = name
      const temp = await hashElementPromise(stats, dir, base, options, isRootElement);

      if (!options.symbolicLinks.ignoreTargetPath) {
        const hash = crypto.createHash(options.algo);
        hash.update(temp.hash);
        log.symlink('hash targetpath');
        hash.update(target);
        temp.hash = hash.digest(options.encoding);
      }
      return temp;
    } catch (err) {
      if (options.symbolicLinks.ignoreTargetContentAfterError) {
        log.symlink(`Ignoring error "${err.code}" when hashing symbolic link ${name}`, err);
        const hash = crypto.createHash(options.algo);
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
        log.symlink(`Error "${err.code}": When hashing symbolic link ${name}`, err);
        throw err;
      }
    }
  }

  function stripBase(path, base) {
    let result = path.replace(base, '')
    if (result.startsWith('/')) result = result.substring(1)

    return result
  }

  function ignore(name: string, path: string, root: string, rules) {
    path = stripBase(path, root)

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

export function parseParameters(args): Promise<{basename: string, dir: string, options: Options}> {
  let basename = args[0],
    dir = args[1],
    options_ = args[2];

  if (!isString(basename)) {
    return Promise.reject(new TypeError('First argument must be a string'));
  }

  if (!isString(dir)) {
    dir = path.dirname(basename);
    basename = path.basename(basename);
    options_ = args[1];
  }

  // parse options (fallback default options)
  if (!isObject(options_)) options_ = {};
  const options = {
    algo: options_.algo || defaultOptions.algo,
    encoding: options_.encoding || defaultOptions.encoding,
    files: Object.assign({}, defaultOptions.files, options_.files),
    folders: Object.assign({}, defaultOptions.folders, options_.folders),
    symbolicLinks: Object.assign({}, defaultOptions.symbolicLinks, options_.symbolicLinks),
  };

  // transform match globs to Regex
  options.files.exclude = reduceGlobPatterns(options.files.exclude);
  options.files.include = reduceGlobPatterns(options.files.include);
  options.folders.exclude = reduceGlobPatterns(options.folders.exclude);
  options.folders.include = reduceGlobPatterns(options.folders.include);

  return Promise.resolve(log.params({ basename, dir, options }));
}

class HashedFolder {
  name: string
  hash: string
  children: HashedEntity[]
  constructor(name: string, children: HashedEntity[], options, isRootElement = false) {
    this.name = name;
    this.children = children;

    const hash = crypto.createHash(options.algo);
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
    children.forEach(child => {
      if (child.hash) {
        hash.update(child.hash);
      }
    });

    this.hash = hash.digest(options.encoding);
  }

  toString(padding = '') {
    const first = `${padding}{ name: '${this.name}', hash: '${this.hash}',\n`;
    padding += '  ';

    return `${first}${padding}children: ${this.childrenToString(padding)}}`;
  }

  childrenToString(padding = '') {
    if (this.children.length === 0) {
      return '[]';
    } else {
      const nextPadding = padding + '  ';
      const children = this.children.map(child => child.toString(nextPadding)).join('\n');
      return `[\n${children}\n${padding}]`;
    }
  }
}

class HashedFile {
  name: string
  hash: string

  constructor(name: string, hash: crypto.Hash, encoding: crypto.BinaryToTextEncoding) {
    this.name = name;
    this.hash = hash.digest(encoding);
  }

  toString(padding = '') {
    return padding + "{ name: '" + this.name + "', hash: '" + this.hash + "' }";
  }
}

function isFunction(any) {
  return typeof any === 'function';
}

function isString(str) {
  return typeof str === 'string' || str instanceof String;
}

function isObject(obj) {
  return obj !== null && typeof obj === 'object';
}

function notUndefined(obj) {
  return typeof obj !== 'undefined';
}

function reduceGlobPatterns(globs) {
  if (isFunction(globs)) {
    return globs;
  } else if (!globs || !Array.isArray(globs) || globs.length === 0) {
    return undefined;
  } else {
    // combine globs into one single RegEx
    const regex = new RegExp(
      globs
        .reduce((acc, exclude) => {
          const re = minimatch.makeRe(exclude)
          if (!re) {
            throw new Error(`Failed to parse glob: ${exclude}`);
          }
          return acc + '|' + re.source;
        }, '')
        .substring(1),
    );
    return param => regex.test(param);
  }
}

export const hashElement = prep(require('fs'))
export const defaults = defaultOptions
