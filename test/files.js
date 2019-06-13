const path = require('path');
const { prep, Volume, should, inspect } = require('./_common');

describe('Generating hashes over files, it', function () {
    it('should return the same hash if a file was not changed', function () {
        const file = path.join('folder, file');
        const fs = Volume.fromJSON({ 'file': 'content' }, 'folder');
        const hash = prep(fs);

        return hash('file', 'folder').then(hash1 => {
            fs.writeFileSync(file, 'content');
            return hash('file', 'folder').then(result => {
                result.hash.should.equal(hash1.hash);
            });
        });
    });

    it('should return the same hash if a file has the same name and content, but exists in a different folder', function () {
        const json = {};
        json[path.join('folder one', 'file.txt')] = 'not empty';
        json[path.join('another folder', 'file.txt')] = 'not empty';
        const hash = prep(Volume.fromJSON(json));

        return Promise.all([
            hash(path.join('folder one', 'file.txt')),
            hash(path.join('another folder', 'file.txt'))
        ])
            .then(results => results[0].hash.should.equal(results[1].hash));
    });

    it('should return a different hash if the file has the same name but a different content', function () {
        const json = {};
        json[path.join('folder1', 'file.txt')] = '1st file';
        json[path.join('folder2', 'file.txt')] = '2nd file';
        const hash = prep(Volume.fromJSON(json));

        return Promise.all([
            hash('file.txt', 'folder1'),
            hash('file.txt', 'folder2')
        ])
            .then(results => results[0].hash.should.not.equal(results[1].hash));
    });

    it('should return a different hash if the file has the same content but a different name', function () {
        const hash = prep(Volume.fromJSON({ 'one': 'content', 'two': 'content' }));
        return Promise.all([hash('one'), hash('two')])
            .then(results => {
                return results[0].hash.should.not.equal(results[1].hash);
            });
    });

    it('generates the same hash if only the name differs and ignoreRootName is set', function () {
        const hashElement = prep(Volume.fromJSON({
            'abc.txt': 'awesome content',
            'def/ghi.js': 'awesome content',
        }));
        const options = {  files: { ignoreRootName: true } };

        return Promise.all([
            hashElement('abc.txt', options),
            hashElement('def/ghi.js', options)
        ]).then(function (hashes) { 
            return hashes[0].hash.should.equal(hashes[1].hash);
        });
    });

    it('generates the same hash if ignoreBasename is true and the files have the same content', function () {
        const hashElement = prep(Volume.fromJSON({
            'abc': 'awesome content',
            'def/ghi.js': 'awesome content',
        }));
        const options = {  files: { ignoreBasename: true } };
        return Promise.all([
            hashElement('abc', options),
            hashElement('def/ghi.js', options)
        ]).then(function (hashes) { 
            return hashes[0].hash.should.equal(hashes[1].hash);
        });
    });
});
