"use strict"

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Q = require('q');

var Promise = Q.Promise;

var algo = 'sha1';
var encoding = 'base64'; // 'base64', 'hex' or 'binary'

module.exports = {
    hashElement: hashElement/** /,
    hashFolderPromise: hashFolderPromise,
    hashFilePromise: hashFilePromise/**/
}

function hashElement(name, directoryPath, callback) {
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
    })
    .nodeify(callback);;
}


function hashFolderPromise(foldername, directoryPath) {
    var TAG = 'hashFolderPromise(' + foldername + ', ' + directoryPath + '):';
    var folderPath = path.join(directoryPath, foldername);
    return Promise(function (resolve, reject, notify) {
        console.log(TAG);
        fs.readdir(folderPath, function (err, files) {
            if (err) {
                console.error(TAG, err);
                reject(err);
            }
            
            console.log(TAG + 'children:', files);
            
            var children = files.map(function (child) {
                return hashElement(child, folderPath);
            });
            
            var allChildren = Q.all(children);
            
            return allChildren.then(function (children) {
                
                var hash = crypto.createHash(algo);
                hash.write(foldername);
                children.forEach(function (child) {
                    if (child.hash) {
                        hash.write(child.hash);
                    }
                });

                var checksum = hash.digest(encoding);
                
                resolve({ name: foldername, hash: checksum, children: children });
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
                var result = hash.digest(encoding);
                
                resolve({
                    name: filename,
                    hash: result
                });
            });

        } catch (ex) {
            reject(ex);
        }
    });
}