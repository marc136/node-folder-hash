"use strict"

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Q = require('q');

var Promise = Q.Promise;

var algo = 'sha1';
var encoding = 'base64'; // 'base64', 'hex' or 'binary'

module.exports = {
    hashElement: createHash/** /,
    hashFolderPromise: hashFolderPromise,
    hashFilePromise: hashFilePromise/**/
}

/**
 * Create a hash over a folder or file, using either promises or error-first-callbacks.
 * The parameter directoryPath is optional. This function may be called 
 *  as createHash(filename, folderpath, fn(err, hash) {}), createHash(filename, folderpath) 
 *  or as createHash(path, fn(err, hash) {}), createHash(path)
 */
function createHash(name, directoryPath, callback) {
    function isString(str) {
        return (typeof str == 'string' || str instanceof String)
    }
    
    return Promise(function (resolve, reject, notify) {
        
        if (!isString(name)) {
            reject(new TypeError('First argument must be a string'));
        }
        if (!isString(directoryPath)) {
            if (typeof directoryPath === 'function') {
                callback = directoryPath;
            }
            
            directoryPath = path.dirname(name);
            name = path.basename(name);
        }
        
        resolve(hashElementPromise(name, directoryPath, callback));
    }).nodeify(callback);
}

function hashElementPromise(name, directoryPath) {
    var filepath = path.join(directoryPath, name);
    return Promise(function (resolve, reject, notify) {
        fs.stat(filepath, function (err, stats) {
            if (err) {
                return reject(err);
            }
            
            if (stats.isDirectory()) {
                resolve(hashFolderPromise(name, directoryPath));
            } else if (stats.isFile()) {
                resolve(hashFilePromise(name, directoryPath));
            } else {
                resolve({ name: name, hash: 'unknown element type' });
            }
        });
    });
}


function hashFolderPromise(foldername, directoryPath) {
    var TAG = 'hashFolderPromise(' + foldername + ', ' + directoryPath + '):';
    var folderPath = path.join(directoryPath, foldername);
    return Promise(function (resolve, reject, notify) {
        fs.readdir(folderPath, function (err, files) {
            if (err) {
                console.error(TAG, err);
                reject(err);
            }
            
            var children = files.map(function (child) {
                return hashElementPromise(child, folderPath);
            });
            
            var allChildren = Q.all(children);
            
            return allChildren.then(function (children) {
                var hash = new HashedFolder(foldername, children);
                resolve(hash);
            });
        });
    });
}


function hashFilePromise(filename, directoryPath) {
    return Promise(function (resolve, reject, notify) {
        try {
            var hash = crypto.createHash(algo);
            hash.write(filename);
            
            var f = fs.createReadStream(path.join(directoryPath, filename));
            f.pipe(hash, { end: false });
            
            f.on('end', function () {
                var hashedFile = new HashedFile(filename, hash);
                resolve(hashedFile);
            });

        } catch (ex) {
            reject(ex);
        }
    });
}


var HashedFolder = function (name, children) {
    this.name = name;
    this.children = children;
    
    var hash = crypto.createHash(algo);
    hash.write(name);
    children.forEach(function (child) {
        if (child.hash) {
            hash.write(child.hash);
        }
    });
    
    this.hash = hash.digest(encoding);
}

HashedFolder.prototype.toString = function (padding) {
    if (typeof padding === 'undefined') padding = "";
    var str = padding + '{ name: \'' + this.name + '\', hash: \'' + this.hash + '\'\n';
    padding += '  ';
    str += padding + 'children: ';
    if (this.children.length === 0) {
        str += '[]';
    } else {
        let nextPadding = padding + "  ";
        let childElements = this.children.map(function (child) { return child.toString(nextPadding); });
        str += '[\n' + childElements.join('\n') + '\n' + padding + ']';
    }

    return str + ' }';
}

var HashedFile = function (name, hash) {
    this.name = name;
    this.hash = hash.digest(encoding);
}

HashedFile.prototype.toString = function (padding) {
    if (typeof padding === 'undefined') padding = "";
    return padding + '{ name: \'' + this.name + '\', hash: \'' + this.hash + '\' }';
}