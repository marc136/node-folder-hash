const path = require('path');
const { prep, Volume, should, inspect } = require('./_common');

describe('Generating a hash over a folder, it', function () {
    function recAssertHash(hash) {
        assert.ok(hash.hash);
        if (hash.children && hash.children.length > 0) {
            hash.children.forEach(recAssertHash);
        }
    }

    it('generates a hash over the folder name and over the combination hashes of all its children', function () {
        const hashElement = prep(Volume.fromJSON({
            'abc/def': 'abc/def',
            'abc/ghi/jkl/file.js': 'content',
            'abc/ghi/jkl/file2.js': 'content',
            'abc/ghi/folder/data.json': 'content',
            'abc/ghi/folder/subfolder/today.log': 'content'
        }));

        const checkChildren = current => {
            should.exist(current.hash);
            if (current.children && current.children.length > 0) {
                current.children.forEach(checkChildren);
            }
        };

        return hashElement('abc').then(checkChildren);
    });

    it('ignores things with an exclude function', function () {
        const hashElement = prep(Volume.fromJSON({
            'abc/def': 'abc/def',
            'abc/ghi/jkl/file.js': 'content',
            'abc/ghi/jkl/file2.js': 'content',
            'abc/ghi/folder/data.json': 'content',
            'abc/ghi/folder/subfolder/today.log': 'content'
        }));

        const options = {
          folders: {
            exclude: path => path.includes('ghi')
          }
        };

        const checkChildren = current => {
            current.children.length.should.equal(1);
            current.children[0].name.should.equal('def');
        };

        return hashElement('abc', options).then(checkChildren);
    });

    it('generates different hashes if the folders have the same content but different names', function () {
        const hashElement = prep(Volume.fromJSON({
            'folder1/file1': 'content',
            '2nd folder/file1': 'content'
        }));

        return Promise.all([
            hashElement('folder1'),
            hashElement('2nd folder')
        ]).then(([first, second]) => {
            should.exist(first.hash);
            first.hash.should.not.equal(second.hash);
            should.exist(first.children[0].hash);
            first.children[0].hash.should.equal(second.children[0].hash);
        });
    });

    it('generates different hashes if the folders have the same name but different content (one file content changed)', function () {
        const hashElement = prep(Volume.fromJSON({
            'folder1/folder2/file1': 'content',
            '2nd folder/file1': 'content'
        }));

        return Promise.all([
            hashElement('folder1'),
            hashElement('2nd folder')
        ]).then(([first, second]) => {
            should.exist(first.hash);
            first.hash.should.not.equal(second.hash);
        });
    });

    it('generates the same hash if the folders have the same name and the same content', function () {
        const hashElement = prep(Volume.fromJSON({
            'first/file1': 'content',
            'first/folder/file2': 'abc',
            'first/folder/file3': 'abcd',
            '2nd/folder/first/file1': 'content',
            '2nd/folder/first/folder/file2': 'abc',
            '2nd/folder/first/folder/file3': 'abcd'
        }));

        return Promise.all([
            hashElement('first'),
            hashElement('first', path.join('2nd', 'folder'))
        ]).then(([first, second]) => {
            should.exist(first.hash);
            first.hash.should.equal(second.hash);
        });
    });

    it('generates the same hash if the folders have the same content but different file order', function () {
        const hashElement = prep(Volume.fromJSON({
            'first/file1': 'content',
            'first/folder/file2': 'abc',
            'first/folder/file3': 'abcd',
            '2nd/folder/first/file1': 'content',
            '2nd/folder/first/folder/file3': 'abcd',
            '2nd/folder/first/folder/file2': 'abc'
        }));

        return Promise.all([
            hashElement('first'),
            hashElement('first', path.join('2nd', 'folder'))
        ]).then(([first, second]) => {
            should.exist(first.hash);
            first.hash.should.equal(second.hash);
        });
    })

    it('generates the same hash if the only file with different content is ignored', function () {
        const hashElement = prep(Volume.fromJSON({
            'base/file1': 'content',
            'base/folder/file2': 'abc',
            'base/folder/file3': 'abcd',
            '2nd/base/file1': 'content',
            '2nd/base/folder/file2': 'another content',
            '2nd/base/folder/file3': 'abcd',
            '3rd/base/file1': 'content',
            '3rd/base/dummy': '',
            '3rd/base/folder/file3': 'abcd'
        }));

        return Promise.all([
            hashElement('base', {
                files: {
                    exclude: ['**/file2', '**file2'], matchBasename: false, matchPath: true
                }
            }),
            hashElement(path.join('2nd', 'base'), {
                files: {
                    exclude: ['file2'], matchBasename: true, matchPath: false
                }
            }),
            hashElement('base', '3rd', {
                files: {
                    exclude: ['dummy'], matchBasename: true, matchPath: false
                }
            })
        ]).then(result => {
            should.exist(result[0].hash);
            result[0].hash.should.equal(result[1].hash);
            result[1].hash.should.equal(result[2].hash);
        });
    });

    it('generates the same hash if all differences are ignored', function () {
        const hashElement = prep(Volume.fromJSON({
            'base/file1': 'content',
            'base/.gitignore': 'empty',
            'base/folder/file2': '2',
            '2nd/base/file1': 'content',
            '2nd/base/folder/file2': '2',
            '2nd/base/folder/.git/one': '1',
            '3rd/base/file1': 'content',
            '3rd/base/folder/file2': '2',
            '3rd/base/folder/.hidden': 'hidden',
            '3rd/base/.hidden/file': 'hidden'
        }));

        return Promise.all([
            hashElement('base', {
                files: {
                    exclude: ['**/.*', '**\.*'],
                    matchBasename: false, matchPath: true
                }
            }),
            hashElement(path.join('2nd', 'base'), {
                folders: {
                    exclude: ['**\/.*', '**\.*'],
                    matchBasename: false, matchPath: true
                }
            }),
            hashElement('base', '3rd', {
                files: { exclude: ['.*'] },
                folders: { exclude: ['.*'] }
            })
        ]).then(result => {
            should.exist(result[0].hash);
            result[0].hash.should.equal(result[1].hash);
            result[1].hash.should.equal(result[2].hash);
        });
    });

    it('ignores a folder it is both included and excluded', function () {
        const hashElement = prep(Volume.fromJSON({
            'base/file1': 'content',
            'base/folder/file2': '2',
            'base/folder2/file3': '3'
        }));

        return hashElement('base', {
            folders: {
                exclude: ['**/folder', '**folder'], include: ['*'],
                matchBasename: false, matchPath: true
            }
        })
            .then(result => {
                should.exist(result.hash);
                should.exist(result.children);
                result.children.length.should.equal(2);
                result.children[0].name.should.equal('file1');
                result.children[1].name.should.equal('folder2');
            });
    });

    it('only includes the wanted folders', function () {
        const hashElement = prep(Volume.fromJSON({
            'abc/file': 'content',
            'def/file': 'content',
            'abc2/file': 'content',
            'abc3/file': 'content'
        }));

        return Promise.all([
            hashElement('./', {
                folders: {
                    include: ['abc*'], matchBasename: true, matchPath: false
                }
            }),
            hashElement('./', {
                folders: {
                    include: ['**abc*'], matchBasename: false, matchPath: true
                }
            })
        ]).then(result => {
            should.exist(result[0].children);
            result[0].children.length.should.equal(3);
            result[0].hash.should.equal(result[1].hash);
        });
    });

    it('only includes the wanted files', function () {
        const hashElement = prep(Volume.fromJSON({
            'file1.js': 'file1',
            'file1.abc.js': 'content',
            'file1.js.ext': 'ignore',
            'def/file1.js': 'content',
            'def/file1.json': 'ignore'
        }));

        return Promise.all([
            hashElement('./', {
                files: {
                    include: ['*.js'], matchBasename: true, matchPath: false
                }
            }),
            hashElement('./', {
                files: {
                    include: ['**/*.js', '**.js'],
                    matchBasename: false, matchPath: true
                }
            })
        ]).then(result => {
            //console.log(result.map(r => r.toString()).join('\n'));
            should.exist(result[0].children);
            result[0].children.length.should.equal(3);
            result[0].hash.should.equal(result[1].hash);
        });
    });

    it('generates the same hash if the folders only differ in name and ignoreRootName is set', function () {
        const hashElement = prep(Volume.fromJSON({
            'abc/def/ghi': 'content of ghi',
            'abc/file1.js': '//just a comment',
            'def/def/ghi': 'content of ghi',
            'def/file1.js': '//just a comment',
            'def/def/.ignored': 'ignored'
        }));
        const options = { 
            folders: { ignoreRootName: true },
            files: { exclude: ['.*'] } 
        };

        return Promise.all([
            hashElement('abc', options),
            hashElement('def', options)
        ]).then(function (hashes) { 
            return hashes[0].hash.should.equal(hashes[1].hash);
        });
    });

    it('generates the same hash if the folders only differ in name and ignoreBasename is set', function () {
        const hashElement = prep(Volume.fromJSON({
            'abc/def/ghi': 'content of ghi',
            'abc/file1.js': '//just a comment',
            'def/def/ghi': 'content of ghi',
            'def/file1.js': '//just a comment',
            'def/def/.ignored': 'ignored'
        }));
        const options = { 
            folders: { ignoreBasename: true },
            files: { exclude: ['.*'] } 
        };

        return Promise.all([
            hashElement('abc', options),
            hashElement('def', options)
        ]).then(function (hashes) { 
            return hashes[1].hash.should.equal(hashes[0].hash);
        });
    });
});
