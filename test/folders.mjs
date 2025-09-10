import assert from 'node:assert';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import { prep, Volume, inspect } from './_common.mjs';

describe('Generating a hash over a folder, it', () => {
  function recAssertHash(hash) {
    assert(hash.hash, 'Hash should exist');
    if (hash.children && hash.children.length > 0) {
      hash.children.forEach(recAssertHash);
    }
  }

  it('generates a hash over the folder name and over the combination hashes of all its children', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'abc/def': 'abc/def',
        'abc/ghi/jkl/file.js': 'content',
        'abc/ghi/jkl/file2.js': 'content',
        'abc/ghi/folder/data.json': 'content',
        'abc/ghi/folder/subfolder/today.log': 'content',
      }),
    );

    const checkChildren = current => {
      assert(current.hash, 'Hash should exist');
      if (current.children && current.children.length > 0) {
        current.children.forEach(recAssertHash);
      }
    };

    const current = await hashElement('abc');
    return checkChildren(current);
  });

  it('ignores things with an exclude function', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'abc/def': 'abc/def',
        'abc/ghi/jkl/file.js': 'content',
        'abc/ghi/jkl/file2.js': 'content',
        'abc/ghi/folder/data.json': 'content',
        'abc/ghi/folder/subfolder/today.log': 'content',
      }),
    );

    const options = {
      folders: {
        exclude: path => path.includes('ghi'),
      },
    };

    const checkChildren = current => {
      assert.strictEqual(current.children.length, 1, 'Should have one child');
      assert.strictEqual(current.children[0].name, 'def', 'Child name should be "def"');
    };

    const current = await hashElement('abc', options);
    return checkChildren(current);
  });

  it('also allows to hash `../`', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'abc/def': 'abc/def',
        'abc/ghi/jkl/file.js': 'content',
        'abc/ghi/jkl/file2.js': 'content',
        'abc/ghi/folder/data.json': 'content',
        'abc/ghi/folder/subfolder/today.log': 'content',
      }),
    );

    const options = {
      folders: {
        exclude: ['jkl'],
      },
    };

    const checkChildren = current => {
      assert.strictEqual(current.children.length, 1, 'Should have one child');
      assert.strictEqual(current.children[0].name, 'folder', 'Child name should be "folder"');
    };

    await hashElement('abc/ghi', options).then(checkChildren);

    await hashElement('../', 'abc/ghi/jkl', options).then(checkChildren);
  });

  it('generates different hashes if the folders have the same content but different names', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'folder1/file1': 'content',
        '2nd folder/file1': 'content',
      }),
    );

    const [first, second] = await Promise.all([hashElement('folder1'), hashElement('2nd folder')]);
    assert(first.hash, 'First hash should exist');
    assert.notStrictEqual(first.hash, second.hash, 'Hashes should not be equal');
    assert(first.children[0].hash, 'Child hash should exist');
    assert.strictEqual(
      first.children[0].hash,
      second.children[0].hash,
      'Child hashes should be equal',
    );
  });

  it('generates different hashes if the folders have the same name but different content (one file content changed)', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'folder1/folder2/file1': 'content',
        '2nd folder/file1': 'content',
      }),
    );

    const [first, second] = await Promise.all([hashElement('folder1'), hashElement('2nd folder')]);
    assert(first.hash, 'First hash should exist');
    assert.notStrictEqual(first.hash, second.hash, 'Hashes should not be equal');
  });

  it('generates the same hash if the folders have the same name and the same content', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'first/file1': 'content',
        'first/folder/file2': 'abc',
        'first/folder/file3': 'abcd',
        '2nd/folder/first/file1': 'content',
        '2nd/folder/first/folder/file2': 'abc',
        '2nd/folder/first/folder/file3': 'abcd',
      }),
    );

    const [first, second] = await Promise.all([
      hashElement('first'),
      hashElement('first', path.join('2nd', 'folder')),
    ]);
    assert(first.hash, 'First hash should exist');
    assert.strictEqual(first.hash, second.hash, 'Hashes should be equal');
  });

  it('generates the same hash if the folders have the same content but different file order', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'first/file1': 'content',
        'first/folder/file2': 'abc',
        'first/folder/file3': 'abcd',
        '2nd/folder/first/file1': 'content',
        '2nd/folder/first/folder/file3': 'abcd',
        '2nd/folder/first/folder/file2': 'abc',
      }),
    );

    const [first, second] = await Promise.all([
      hashElement('first'),
      hashElement('first', path.join('2nd', 'folder')),
    ]);
    assert(first.hash, 'First hash should exist');
    assert.strictEqual(first.hash, second.hash, 'Hashes should be equal');
  });

  it('generates the same hash if the folders have the same content but different file order', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'first/file1': 'content',
        'first/folder/file2': 'abc',
        'first/folder/file3': 'abcd',
        '2nd/folder/first/file1': 'content',
        '2nd/folder/first/folder/file3': 'abcd',
        '2nd/folder/first/folder/file2': 'abc',
      }),
    );

    const [first, second] = await Promise.all([
      hashElement('first'),
      hashElement('first', path.join('2nd', 'folder')),
    ]);
    assert(first.hash, 'First hash should exist');
    assert.strictEqual(first.hash, second.hash, 'Hashes should be equal');
  });

  it('generates the same hash if the only file with different content is ignored', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'base/file1': 'content',
        'base/folder/file2': 'abc',
        'base/folder/file3': 'abcd',
        '2nd/base/file1': 'content',
        '2nd/base/folder/file2': 'another content',
        '2nd/base/folder/file3': 'abcd',
        '3rd/base/file1': 'content',
        '3rd/base/dummy': '',
        '3rd/base/folder/file3': 'abcd',
      }),
    );

    const result1 = await hashElement('base', {
      files: {
        exclude: ['**/file2', '**file2'],
        matchBasename: false,
        matchPath: true,
      },
    });
    const result2 = await hashElement(path.join('2nd', 'base'), {
      files: {
        exclude: ['file2'],
        matchBasename: true,
        matchPath: false,
      },
    });
    const result3 = await hashElement('base', '3rd', {
      files: {
        exclude: ['dummy'],
        matchBasename: true,
        matchPath: false,
      },
    });
    assert(result1.hash, 'First result hash should exist');
    assert.strictEqual(result1.hash, result2.hash, 'First and second hashes should be equal');
    assert.strictEqual(result2.hash, result3.hash, 'Second and third hashes should be equal');
  });

  it('generates the same hash if all differences are ignored', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'base/file1': 'content',
        'base/.gitignore': 'empty',
        'base/folder/file2': '2',
        '2nd/base/file1': 'content',
        '2nd/base/folder/file2': '2',
        '2nd/base/folder/.git/one': '1',
        '3rd/base/file1': 'content',
        '3rd/base/folder/file2': '2',
        '3rd/base/folder/.hidden': 'hidden',
        '3rd/base/.hidden/file': 'hidden',
      }),
    );

    const result1 = await hashElement('base', {
      files: {
        exclude: ['**/.*', '**.*'],
        matchBasename: false,
        matchPath: true,
      },
    });
    const result2 = await hashElement(path.join('2nd', 'base'), {
      folders: {
        exclude: ['**/.*', '**.*'],
        matchBasename: false,
        matchPath: true,
      },
    });
    const result3 = await hashElement('base', '3rd', {
      files: { exclude: ['.*'] },
      folders: { exclude: ['.*'] },
    });
    assert(result1.hash, 'First result hash should exist');
    assert.strictEqual(result1.hash, result2.hash, 'First and second hashes should be equal');
    assert.strictEqual(result2.hash, result3.hash, 'Second and third hashes should be equal');
  });

  it('ignores a folder if it is both included and excluded', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'base/file1': 'content',
        'base/folder/file2': '2',
        'base/folder2/file3': '3',
      }),
    );

    async function verify(options) {
      const result = await hashElement('base', options);
      assert(result.hash, 'Result hash should exist');
      assert(result.children, 'Result children should exist');
      assert.strictEqual(result.children.length, 2, 'Should have two children');
      assert.strictEqual(result.children[0].name, 'file1', 'First child name should be "file1"');
      assert.strictEqual(
        result.children[1].name,
        'folder2',
        'Second child name should be "folder2"',
      );
    }

    const include1 = process.platform === 'win32' ? '*' : '**/*';

    await verify({
      folders: {
        exclude: [path.join('**', 'folder')],
        include: [include1],
        matchBasename: false,
        matchPath: true,
      },
    });

    await verify({
      folders: {
        exclude: ['folder'],
        include: ['*'],
        matchBasename: true,
        matchPath: false,
      },
    });
  });

  it('only includes the wanted folders', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'abc/file': 'content',
        'def/file': 'content',
        'abc2/file': 'content',
        'abc3/file': 'content',
      }),
    );

    const result1 = await hashElement('./', {
      folders: {
        include: ['abc*'],
        matchBasename: true,
        matchPath: false,
      },
    });
    const result2 = await hashElement('./', {
      folders: {
        include: ['**abc*'],
        matchBasename: false,
        matchPath: true,
      },
    });
    assert(result1.children, 'Result children should exist');
    assert.strictEqual(result1.children.length, 3, 'Should have three children');
    assert.strictEqual(result1.hash, result2.hash, 'Hashes should be equal');
  });

  it('only includes the wanted files', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'file1.js': 'file1',
        'file1.abc.js': 'content',
        'file1.js.ext': 'ignore',
        'def/file1.js': 'content',
        'def/file1.json': 'ignore',
      }),
    );

    const result = await Promise.all([
      hashElement('./', {
        files: {
          include: ['*.js'],
          matchBasename: true,
          matchPath: false,
        },
      }),
      hashElement('./', {
        files: {
          include: ['**/*.js', '**.js'],
          matchBasename: false,
          matchPath: true,
        },
      }),
    ]);
    assert(result[0].children, 'Result children should exist');
    assert.strictEqual(result[0].children.length, 3, 'Should have three children');
    assert.strictEqual(result[0].hash, result[1].hash, 'Hashes should be equal');
  });

  it('generates the same hash if the folders only differ in name and ignoreRootName is set', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'abc/def/ghi': 'content of ghi',
        'abc/file1.js': '//just a comment',
        'def/def/ghi': 'content of ghi',
        'def/file1.js': '//just a comment',
        'def/def/.ignored': 'ignored',
      }),
    );
    const options = {
      folders: { ignoreRootName: true },
      files: { exclude: ['.*'] },
    };

    const result1 = await hashElement('abc', options);
    const result2 = await hashElement('def', options);
    return assert.strictEqual(result1.hash, result2.hash, 'Hashes should be equal');
  });

  it('generates the same hash if the folders only differ in name and ignoreBasename is set', async () => {
    const hashElement = prep(
      Volume.fromJSON({
        'abc/def/ghi': 'content of ghi',
        'abc/file1.js': '//just a comment',
        'def/def/ghi': 'content of ghi',
        'def/file1.js': '//just a comment',
        'def/def/.ignored': 'ignored',
      }),
    );
    const options = {
      folders: { ignoreBasename: true },
      files: { exclude: ['.*'] },
    };

    const result1 = await hashElement('abc', options);
    const result2 = await hashElement('def', options);
    return assert.strictEqual(result1.hash, result2.hash, 'Hashes should be equal');
  });
});
