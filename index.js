"use strict"

var path = require('path');
var crypto = require('crypto');
var minimatch = require('minimatch');

const defaultOptions = {
    algo: 'sha1',       // see crypto.getHashes() for options
    encoding: 'base64', // 'base64', 'hex' or 'binary'
    excludes: [],
    match: {
        basename: true,
        path: true
    }
};

function prep(fs, Promise) {
    /**
     * Create a hash over a folder or file, using either promises or error-first-callbacks.
     * 
     * Examples:
     * - hashElement(filename, folderpath, options, fn(err, hash) {}), hashElement(filename, folderpath, options);
     * - hashElement(path, fn(err, hash) {}), hashElement(path)
     * 
     * @param {string} name - element name or an element's path
     * @param {string} [dir] - directory that contains the element (if omitted is generated from name)
     * @param {Object} [options] - Options
     * @param {string} [options.algo='sha1'] - checksum algorithm, see options in crypto.getHashes()
     * @param {string} [options.encoding='base64'] - encoding of the resulting hash. One of 'base64', 'hex' or 'binary'
     * @param {string[]} [options.excludes=[]] - Array of optional exclude file glob patterns, see minimatch doc
     * @param {bool} [options.match.basename=true] - Match the exclude patterns to the file/folder name
     * @param {bool} [options.match.path=true] - Match the exclude patterns to the file/folder path
     * @param {fn} [callback] - Error-first callback function
     */
    function hashElement(name, directoryPath, options, callback) {
        callback = arguments[arguments.length - 1];

        return parseParameters(arguments)
            //console.log('parsed options:', options);
            .then(({ basename, dir, options }) => {
                //console.log('parsed options:', options);
                return hashElementPromise(basename, dir, options)
            })
            .then(function (result) {
                if (typeof callback === 'function') {
                    return callback(undefined, result);
                } else {
                    return result;
                }
            })
            .catch(function (reason) {
                if (typeof callback === 'function') {
                    return callback(reason);
                } else {
                    throw reason;
                }
            });
    }

    function hashElementPromise(basename, dirname, options) {
        var filepath = path.join(dirname, basename);

        if (options.match.basename && options.excludes && options.excludes.test(basename)) {
            //console.log('regex', options.excludes, 'matched to', basename);
            return Promise.resolve(undefined);
        }

        if (options.match.path && options.excludes && options.excludes.test(filepath)) {
            //console.log('regex', options.excludes, 'matched to', filepath);
            return Promise.resolve(undefined);
        }

        return new Promise(function (resolve, reject, notify) {
            fs.stat(filepath, function (err, stats) {
                if (err) {
                    return reject(err);
                }

                if (stats.isDirectory()) {
                    resolve(hashFolderPromise(basename, dirname, options));
                } else if (stats.isFile()) {
                    resolve(hashFilePromise(basename, dirname, options));
                } else {
                    resolve({ name: basename, hash: 'unknown element type' });
                }
            });
        });
    }


    function hashFolderPromise(foldername, directoryPath, options) {
        var folderPath = path.join(directoryPath, foldername);

        var notExcluded = function notExcluded(basename) {
            return !(options.match.basename && options.excludes && options.excludes.test(basename));
        }

        return new Promise(function (resolve, reject, notify) {
            fs.readdir(folderPath, function (err, files) {
                if (err) {
                    var TAG = 'hashFolderPromise(' + foldername + ', ' + directoryPath + '):';
                    console.error(TAG, err);
                    reject(err);
                }

                var children = files.filter(notExcluded).map(function (child) {
                    return hashElementPromise(child, folderPath, options);
                });

                return Promise.all(children).then(function (children) {
                    var hash = new HashedFolder(foldername, children.filter(notUndefined), options);
                    resolve(hash);
                });
            });
        });
    }


    function hashFilePromise(filename, directoryPath, options) {
        return new Promise(function (resolve, reject, notify) {
            try {
                var hash = crypto.createHash(options.algo);
                hash.write(filename);

                var f = fs.createReadStream(path.join(directoryPath, filename));
                f.pipe(hash, { end: false });

                f.on('end', function () {
                    var hashedFile = new HashedFile(filename, hash, options);
                    resolve(hashedFile);
                });

            } catch (ex) {
                reject(ex);
            }
        });
    }


    const HashedFolder = function (name, children, options) {
        this.name = name;
        this.children = children;

        var hash = crypto.createHash(options.algo);
        hash.write(name);
        children.forEach(function (child) {
            if (child.hash) {
                hash.write(child.hash);
            }
        });

        this.hash = hash.digest(options.encoding);
    }

    HashedFolder.prototype.toString = function (padding = '') {
        const first = `${padding}{ name: '${this.name}', hash: '${this.hash},'\n`;
        padding += '  ';

        return `${first}${padding}children: ${this.childrenToString(padding)}}`
    }

    HashedFolder.prototype.childrenToString = function (padding = '') {
        if (this.children.length === 0) {
            return '[]';
        } else {
            const nextPadding = padding + '  ';
            const children = this.children
                .map(child => child.toString(nextPadding))
                .join('\n');
            return `[\n${children}\n${padding}]`;
        }
    }


    const HashedFile = function (name, hash, options) {
        this.name = name;
        this.hash = hash.digest(options.encoding);
    }

    HashedFile.prototype.toString = function (padding = '') {
        return padding + '{ name: \'' + this.name + '\', hash: \'' + this.hash + '\' }';
    }

    return hashElement;
}

function parseParameters(args) {
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
    if (!isObject(options_)) options_ = {}
    const options = {
        algo: options_.algo || defaultOptions.algo,
        encoding: options_.encoding || defaultOptions.encoding,
        excludes: reduceGlobPatterns(notUndefined(options_.excludes) ? options_.excludes : defaultOptions.excludes),
        match: Object.assign({}, defaultOptions.match, options_.match),
    }

    return Promise.resolve({ basename, dir, options })
}

function isString(str) {
    return (typeof str == 'string' || str instanceof String)
}

function isObject(obj) {
    return obj != null && typeof obj === 'object'
}

function notUndefined(obj) {
    return typeof obj !== undefined;
}

function reduceGlobPatterns(globs) {
    if (!globs || !Array.isArray(globs) || globs.length == 0) {
        return undefined;
    } else {
        // combine globs into one single RegEx
        return new RegExp(globs.reduce(function (acc, exclude) {
            return acc + '|' + minimatch.makeRe(exclude).source;
        }, '').substr(1));
    }
}

module.exports = {
    hashElement: prep(require("graceful-fs"), Promise),
    // exposed for testing
    prep: prep,
    parseParameters: parseParameters
};
