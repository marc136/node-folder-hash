import assert from 'node:assert';
import { describe, it } from 'node:test';
import { Volume, prep, inspect } from './_common.mjs';

describe('Issue 14: Create hashes only over the file content (basename is ignored)', () => {
  const expected = 'BA8G_XdAkkeNRQd09bowxdp4rMg';
  const fs = Volume.fromJSON({
    'folder/file.txt': 'content',
    'folder/2ndfile.txt': 'content',
  });
  const hashElement = prep(fs, Promise);
  const folder = 'folder';

  it('in folder-hash <= 3.0.0', async () => {
    const options = { files: { ignoreRootName: true } };

    const files = fs.readdirSync(folder);
    assert.strictEqual(files.length, 2);

    const hashes = await Promise.all(files.map(basename => hashElement(basename, folder, options)));
    assert.notStrictEqual(hashes[0].name, hashes[1].name);
    assert.strictEqual(hashes[0].hash, hashes[1].hash);
    assert.strictEqual(hashes[0].hash, expected);
  });

  it('in folder-hash > 3.0.x', async () => {
    const options = { files: { ignoreBasename: true } };
    const hash = await hashElement(folder, options);
    assert.notStrictEqual(hash.children[0].name, hash.children[1].name);
    assert.strictEqual(hash.children[0].hash, hash.children[1].hash);
    assert.strictEqual(hash.children[1].hash, expected);
  });
});
