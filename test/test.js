
if (typeof Promise === 'undefined') require('when/es6-shim/Promise');

var helper = require('./helper/helper.js');

var fs = require('graceful-fs');
var path = require('path');

var folderHash = require('../index');

var assert = require('assert');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.should();

var sampleFolder = 'sample-folder';
before(helper.createTestFolderStructure(sampleFolder));

describe('Initialization', function () {
    it('should throw an error if no name was passed', function () {
        folderHash.hashElement().should.be.rejectedWith(TypeError);
        folderHash.hashElement(function () {}).should.be.rejectedWith(TypeError);
    });
});


describe('Should generate hashes', function () {
    describe('when called as a promise', function () {
        it('with element and folder passed as two strings', function () {
            return folderHash.hashElement('file1', sampleFolder).should.eventually.have.property('hash');
        });

        it('with element path passed as one string', function () {
            return folderHash.hashElement(path.join(sampleFolder, 'file1')).should.eventually.have.property('hash');
        });

        it('with options passed', function () {
            var options = {
                algo: 'sha1',
                encoding: 'base64',
                excludes: [],
                match: {
                    basename: false,
                    path: false
                }
            };
            return folderHash.hashElement('file1', sampleFolder, options)//.should.eventually.have.property('hash');
            .then((a) => console.log('a:', a)).catch(b => console.error('b', b));
        });
    });

    describe('when executed with an error-first callback', function () {
        it('with element and folder passed as two strings', function (done) {
            folderHash.hashElement('file1', sampleFolder, function (err, hash) {
                if (err) throw err;
                else {
                    assert.ok(hash.hash);
                    done();
                }
            });
        });

        it('with element path passed as one string', function (done) {
            folderHash.hashElement(path.join(sampleFolder, 'file1'), function (err, hash) {
                if (err) throw err;
                else {
                    assert.ok(hash.hash);
                    done();
                }
            });
        });
    });

    describe('and', function () {
        it('should return a string representation', function () {
            folderHash.hashElement('./', sampleFolder)
            .then(function (hash) {
                var str = hash.toString();
                assert.ok(str);
                assert.ok(str.length > 10);
            })
        });
    });
});


describe('Generating hashes over files, it', function () {
    var hash1;
    before(function () {
        return folderHash.hashElement('file1', sampleFolder).then(function (hash) {
            hash1 = hash;
        });
    });

    it('should return the same hash if a file was not changed', function () {
        return folderHash.hashElement('file1', sampleFolder).then(function (hash2) {
            return assert.equal(hash1.hash, hash2.hash);
        });
    });

    it('should return the same hash if a file has the same name and content, but exists in a different folder', function () {
        return folderHash.hashElement('file1', path.join(sampleFolder, 'subfolder1')).then(function (hash2) {
            return assert.equal(hash1.hash, hash2.hash);
        });
    });

    it('should return a different hash if the file has the same name but a different content', function () {
        return folderHash.hashElement('file1', path.join(sampleFolder, 'f2')).then(function (hash2) {
            return assert.notEqual(hash1.hash, hash2.hash);
        });
    });

    it('should return a different hash if the file has the same content but a different name', function () {
        return folderHash.hashElement('file2', sampleFolder).then(function (hash2) {
            return assert.notEqual(hash1.hash, hash2.hash);
        });
    });
});

describe('Generating a hash over a folder, it', function () {
    function recAssertHash(hash) {
        assert.ok(hash.hash);
        if (hash.children && hash.children.length > 0) {
            hash.children.forEach(recAssertHash);
        }
    }

    it('generates a hash over the folder name and over the combination hashes of all its children', function () {
        return folderHash.hashElement('f2', sampleFolder).then(recAssertHash);
    });

    it('generates different hashes if the folders have the same content but different names', function () {
        return Promise.all([
            folderHash.hashElement('subfolder2', path.join(sampleFolder, 'f2')),
            folderHash.hashElement('subfolder1', sampleFolder)
        ]).then(function (hashes) {
            assert.ok(hashes.length > 1, 'should have returned at least two hashes');
            assert.notEqual(hashes[0].hash, hashes[1].hash);
        });
    });

    it('generates different hashes if the folders have the same name but different content (one file content changed)', function () {
        return Promise.all([
            folderHash.hashElement('subfolder1', path.join(sampleFolder, 'f3')),
            folderHash.hashElement('subfolder1', sampleFolder)
        ]).then(function (hashes) {
            assert.ok(hashes.length > 1, 'should have returned at least two hashes');
            assert.notEqual(hashes[0].hash, hashes[1].hash);
        });
    });

    it('generates the same hash if the folders have the same name and the same content', function () {
        return Promise.all([
            folderHash.hashElement('subfolder1', path.join(sampleFolder, 'f2')),
            folderHash.hashElement('subfolder1', sampleFolder)
        ]).then(function (hashes) {
            assert.ok(hashes.length > 1, 'should have returned at least two hashes');
            assert.equal(hashes[0].hash, hashes[1].hash);
        });
    });

    it('f2/subfolder1 should equal f3/subfolder1 if file1 is ignored', function () {
        return Promise.all([
            folderHash.hashElement(path.join(sampleFolder, 'f3/subfolder1'), { excludes: ['**/.*', 'file1'] }),
            folderHash.hashElement(path.join(sampleFolder, 'f2/subfolder1'), { excludes: ['**/.*', 'file1'] })
        ]).then(function (hashes) {
            assert.ok(hashes.length == 2, 'should have returned two hashes');
            assert.equal(hashes[0].hash, hashes[1].hash);
        })
    });
});
