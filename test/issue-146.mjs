import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Volume, inspect, prep } from './_common.mjs';

describe('Issue 146: Handle `EMFILE` and `ENFILE` errors gracefully', () => {
  it('should handle errors and generate the correct hash', async () => {
    const expected = 'BA8G_XdAkkeNRQd09bowxdp4rMg';
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
    const hashElement = prep(fs, Promise);
    const folder = 'folder';
    const options = {};
    const result = await hashElement(folder, options);
    // ensure that the errors were raised
    assert(counter >= 7, 'Counter should be greater than or equal to 7');
    assert.strictEqual(result.hash, 'R2FsYKsO7InBBvZPUwvKGJnRDMI');
  });
});
