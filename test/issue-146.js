const { folderHash, should, inspect } = require('./_common');
const { Volume } = require('memfs');

it('Issue 146: Handle `EMFILE` and `ENFILE` errors gracefully', async function () {
  const expected = 'BA8G/XdAkkeNRQd09bowxdp4rMg=';
  const fs = Volume.fromJSON({
    'folder/file.txt': 'content',
    'folder/file1.txt': 'content',
    'folder/file2.txt': 'content',
    'folder/b/file1.txt': 'content',
    'folder/b/file2.txt': 'content',
    'folder/b/file3.txt': 'content',
  });
  let counter = 0;
  const readdir = fs.promises.readdir;
  fs.promises.readdir = (path, options) => {
    counter++;
    if (counter > 1 && counter < 5) {
      throw { code: 'EMFILE', message: 'fake readdir error' };
    } else if (counter < 10) {
      throw { code: 'ENFILE', message: 'fake readdir error' };
    } else {
      return readdir(path, options);
    }
  };
  const hashElement = folderHash.prep(fs, Promise);
  const folder = 'folder';
  const options = {};
  const result = await hashElement(folder, options);
  // ensure that the errors were raised
  counter.should.be.greaterThanOrEqual(7);
  result.hash.should.equal('rGaf5+7Q5VwsunfiBL9XobKDio4=');
});
