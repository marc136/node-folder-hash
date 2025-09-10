import assert from 'node:assert';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import { prep, Volume, inspect } from './_common.mjs';

describe('Generating hashes over files, it', () => {
  it('should return the same hash if a file was not changed', async () => {
    const file = path.join('folder, file');
    const fs = Volume.fromJSON({ file: 'content' }, 'folder');
    const hash = prep(fs);

    const hash1 = await hash('file', 'folder');
    fs.writeFileSync(file, 'content');
    const result = await hash('file', 'folder');
    assert.strictEqual(result.hash, hash1.hash);
  });

  it('should return the same hash if a file has the same name and content, but exists in a different folder', async () => {
    const json = {};
    json[path.join('folder one', 'file.txt')] = 'not empty';
    json[path.join('another folder', 'file.txt')] = 'not empty';
    const hash = prep(Volume.fromJSON(json));

    const result1 = await hash(path.join('folder one', 'file.txt'));
    const result2 = await hash(path.join('another folder', 'file.txt'));
    return assert.strictEqual(result1.hash, result2.hash);
  });

  it('should return a different hash if the file has the same name but a different content', async () => {
    const json = {};
    json[path.join('folder1', 'file.txt')] = '1st file';
    json[path.join('folder2', 'file.txt')] = '2nd file';
    const hash = prep(Volume.fromJSON(json));

    const result1 = await hash('file.txt', 'folder1');
    const result2 = await hash('file.txt', 'folder2');
    return assert.notStrictEqual(result1.hash, result2.hash);
  });

  it('should return a different hash if the file has the same content but a different name', async () => {
    const hash = prep(Volume.fromJSON({ one: 'content', two: 'content' }));
    const result1 = await hash('one');
    const result2 = await hash('two');
    return assert.notStrictEqual(result1.hash, result2.hash);
  });

  it('generates the same hash if only the name differs and ignoreRootName is set', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'abc.txt': 'awesome content',
        'def/ghi.js': 'awesome content',
      }),
    );
    const options = { files: { ignoreRootName: true } };

    const result1 = await hashElement('abc.txt', options);
    const result2 = await hashElement('def/ghi.js', options);
    return assert.strictEqual(result1.hash, result2.hash);
  });

  it('generates the same hash if ignoreBasename is true and the files have the same content', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        abc: 'awesome content',
        'def/ghi.js': 'awesome content',
      }),
    );
    const options = { files: { ignoreBasename: true } };
    const result1 = await hashElement('abc', options);
    const result2 = await hashElement('def/ghi.js', options);
    return assert.strictEqual(result1.hash, result2.hash);
  });
});
