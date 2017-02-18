"use strict"

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

if (typeof Promise === 'undefined') require('when/es6-shim/Promise');

var defaultOptions = {
    algo: 'sha1',       // see crypto.getHashes() for options
    encoding: 'base64', // 'base64', 'hex' or 'binary'
};

module.exports = {
    hashElement: createHash
}

/**
 * Create a hash over a folder or file, using either promises or error-first-callbacks.
 * The parameter directoryPath is optional. This function may be called
 *  as createHash(filename, folderpath, fn(err, hash) {}), createHash(filename, folderpath)
 *  or as createHash(path, fn(err, hash) {}), createHash(path)
 */
function createHash(name, directoryPath, options, callback) {
    var promise = parseParameters(arguments);
    var callback = arguments[arguments.length-1];

    return promise
    .then(function (result) { 
        if (typeof callback === 'function') return callback(undefined, result);
        return result;
     })
    .catch(function (reason) {
        if (typeof callback === 'function') return callback(reason);
        throw reason;
    });
}

function parseParameters(args) {
    var elementBasename = args[0],
        elementDirname = args[1],
        options = args[2];

    if (!isString(elementBasename)) {
        return Promise.reject(new TypeError('First argument must be a string'));
    }

    if (!isString(elementDirname)) {
        elementDirname = path.dirname(elementBasename);
        elementBasename = path.basename(elementBasename);
        options = args[1];
    }

    // parse options (fallback default options)
    if (!isObject(options)) options = {};
    ['algo', 'encoding', 'excludes'].forEach(function(key) {
        if (!options.hasOwnProperty(key)) options[key] = defaultOptions[key];
    });

    return hashElementPromise(elementBasename, elementDirname, options);
}

function hashElementPromise(basename, dirname, options) {
    var filepath = path.join(dirname, basename);
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
    var TAG = 'hashFolderPromise(' + foldername + ', ' + directoryPath + '):';
    var folderPath = path.join(directoryPath, foldername);
    return new Promise(function (resolve, reject, notify) {
        fs.readdir(folderPath, function (err, files) {
            if (err) {
                console.error(TAG, err);
                reject(err);
            }

            var children = files.map(function (child) {
                return hashElementPromise(child, folderPath, options);
            });

            var allChildren = Promise.all(children);

            return allChildren.then(function (children) {
                var hash = new HashedFolder(foldername, children, options);
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


var HashedFolder = function (name, children, options) {
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

HashedFolder.prototype.toString = function (padding) {
    if (typeof padding === 'undefined') padding = "";
    var str = padding + '{ name: \'' + this.name + '\', hash: \'' + this.hash + '\'\n';
    padding += '  ';
    str += padding + 'children: ';
    if (this.children.length === 0) {
        str += '[]';
    } else {
        var nextPadding = padding + "  ";
        var childElements = this.children.map(function (child) { return child.toString(nextPadding); });
        str += '[\n' + childElements.join('\n') + '\n' + padding + ']';
    }

    return str + ' }';
}


var HashedFile = function (name, hash, options) {
    this.name = name;
    this.hash = hash.digest(options.encoding);
}

HashedFile.prototype.toString = function (padding) {
    if (typeof padding === 'undefined') padding = "";
    return padding + '{ name: \'' + this.name + '\', hash: \'' + this.hash + '\' }';
}


function isString(str) {
    return (typeof str == 'string' || str instanceof String)
}

function isObject(obj) {
    return obj != null && typeof obj === 'object'
}
