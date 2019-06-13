const path = require('path');
const { prep, Volume, should, inspect } = require('./_common');

describe('Should generate hashes', function () {
    const json = {};
    const dir = 'folder', basename = 'file1';
    json[path.join(dir, basename)] = 'file content';
    const hashElement = prep(Volume.fromJSON(json));

    const checkHash = result => {
        should.exist(result);
        should.exist(result.hash);
        result.hash.should.equal('11OqJSEmDW280Sst6dycitwlfCI=');
    };

    describe('when called as a promise', function () {
        it('with element and folder passed as two strings', function () {
            return hashElement(basename, dir).then(checkHash);
        });

        it('with element path passed as one string', function () {
            return hashElement(path.join(dir, basename)).then(checkHash);
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
            return hashElement(basename, dir, options).then(checkHash);
        });
    });

    describe('when executed with an error-first callback', function () {
        it('with element and folder passed as two strings', function () {
            return hashElement(basename, dir, function (err, result) {
                should.not.exist(err);
                checkHash(result);
            });
        });

        it('with element path passed as one string', function () {
            return hashElement(path.join(dir, basename), function (err, result) {
                should.not.exist(err);
                checkHash(result);
            });
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
            return hashElement(path.join(dir, basename), options, function (err, result) {
                should.not.exist(err);
                checkHash(result);
            });
        });
    });

    describe('and', function () {
        it('should return a string representation', function () {
            const fs = Volume.fromJSON({ 'folder/file.txt': 'content' });
            fs.mkdirSync('folder/empty_folder');

            return prep(fs)('folder').then(hash => {
                should.exist(hash);
                const str = hash.toString();
                should.exist(str);
                should.equal(str.length > 10, true);
            });
        });
    });
});
