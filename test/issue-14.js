const { Volume, should, inspect } = require('./_common');
const folderHash = require('../index');

describe('Issue 14: Create hashes only over the file content (basename is ignored)', function () {
  const expected = 'BA8G/XdAkkeNRQd09bowxdp4rMg=';
  const fs = Volume.fromJSON({
    'folder/file.txt': 'content',
    'folder/2ndfile.txt': 'content'
  });
  const hashElement = folderHash.prep(fs, Promise);
  const folder = 'folder';

  it('in folder-hash <= 3.0.0', function () {
    const options = { files: { ignoreRootName: true } };

    const files = fs.readdirSync(folder);
    return Promise.all(
      files.map(basename => hashElement(basename, folder, options))
    ).then(hashes => {
      hashes[0].name.should.not.equal(hashes[1].name);
      hashes[0].hash.should.equal(hashes[1].hash);
      hashes[0].hash.should.equal(expected);
    });
  });

  it('in folder-hash > 3.0.x', function () {
    const options = { files: { ignoreBasename: true } };
    return hashElement(folder, options).then(hash => {
      hash.children[0].name.should.not.equal(hash.children[1].name);
      hash.children[0].hash.should.equal(hash.children[1].hash);
      hash.children[1].hash.should.equal(expected);
    });
  });
});


/*
it.only('generates the same hash if two files have the same content and ignoreBasename is set', function () {
  const hashElement = prep(Volume.fromJSON({
      'file.txt': 'content',
      '3rdfile': 'content1',
      '2ndfile.txt': 'content'
    }));
  const options = {
      files: { ignoreBasename: true }
  };
  return hashElement('.', options).then(function (hash) {
      console.log('hash', hash)
      // files are alphabetically sorted
      hash.children[0].name.should.equal('2ndfile.txt');
      hash.children[1].name.should.equal('3rdfile');
      hash.children[0].hash.should.equal(hash.children[2].hash);
      hash.children[2].hash.should.not.equal(hash.children[1].hash);
  });
});
//*/