import assert from 'node:assert';
import crypto from 'node:crypto';
import path from 'node:path';
import { describe, it } from 'node:test';
import { defaultOptions, prep, Volume, inspect } from './_common.mjs';

describe('When hashing a symbolic link', () => {
  it('should follow a symbolic link follow=resolve (default)', async () => {
    const fs = Volume.fromJSON({ file: 'content' }, 'folder');
    fs.symlinkSync('folder/file', 'soft-link');
    const hash = prep(fs);

    const result = await hash('.', {});
    const symlink = result.children[1];
    assert.strictEqual(symlink.hash, 'BQv_kSJnDNedkXlw_tpcXpf-Mzc');
    const target_1 = result.children[0].children[0];
    const msg =
      'The symlink name is part of the hash, the symlink and its target must have different hashes';
    assert.notEqual(symlink.hash, target_1.hash, msg);
  });

  it('can skip symbolic links', async () => {
    const fs = Volume.fromJSON({ file: 'a' }, 'folder');
    fs.symlinkSync('non-existing', 'l1');
    fs.symlinkSync('folder/file', 'l2');
    const hash = prep(fs);

    const options = { symbolicLinks: { include: false } };
    const result1 = await hash('l1', options);
    const result2 = await hash('l2', options);
    const result3 = await hash('.', options);
    assert.strictEqual(result1, undefined);
    assert.strictEqual(result2, undefined);
    assert(result3, 'result3 should not be undefined');
    assert.strictEqual(result3.children.length, 1);
  });

  it('can ignore the target content', async () => {
    const fs = Volume.fromJSON({ file: 'a' }, 'folder');
    fs.symlinkSync('non-existing', 'l1');
    fs.symlinkSync('folder/file', 'l2');
    const hash = prep(fs);

    const options = { symbolicLinks: { ignoreTargetContent: true } };

    const expected = {
      l1: toHash(['l1']),
      l2: toHash(['l2']),
    };

    const l1 = await hash('l1', options);
    assert.strictEqual(l1.hash, expected.l1);
    const l2 = await hash('l2', options);
    assert.strictEqual(l2.hash, expected.l2);
  });
});

describe('Hashing the symlink to a folder and the folder should return the same hash when', () => {
  it('they have the same basename', async () => {
    const fs = Volume.fromJSON({ a1: 'a', b2: 'bb' }, 'folder');
    fs.mkdirSync('horst');
    fs.symlinkSync('folder', 'horst/folder');
    const hash = prep(fs);

    const options = {
      symbolicLinks: {
        include: true,
        ignoreTargetPath: true,
      },
    };

    const expected = await hash('folder', options);
    const actual = await hash('horst/folder', options);
    assert.deepStrictEqual(actual, expected);
  });

  it('the basename is ignored', async () => {
    const fs = Volume.fromJSON({ a1: 'a', b2: 'bb' }, 'folder');
    fs.symlinkSync('folder', 'folder-link');
    const hash = prep(fs);

    const options = {
      folders: { ignoreBasename: true },
      symbolicLinks: {
        ignoreTargetPath: true,
        ignoreBasename: true,
      },
    };

    const expected = await hash('folder', options);
    const actual = await hash('folder-link', options);
    assert.notEqual(expected.name, actual.name, 'The names should be different');
    delete expected.name;
    delete actual.name;
    assert.deepStrictEqual(actual, expected);
  });
});

describe('When symbolicLinks.ignoreTargetContent is true', () => {
  const fs = Volume.fromJSON({ file: 'a' }, 'folder');
  fs.symlinkSync('non-existing', 'l1');
  fs.symlinkSync('folder/file', 'l2');
  fs.symlinkSync('folder', 'l3');
  const hash = prep(fs);

  it('hashes the name and target path', async () => {
    const options = {
      symbolicLinks: {
        include: true,
        ignoreTargetContent: true,
        ignoreTargetPath: false,
      },
    };
    const actual = await hash('l2', options);
    const expected = toHash(['l2', resolvePath('folder/file')]);
    assert.strictEqual(actual.hash, expected);
  });

  it('hashes the target path', async () => {
    const options = {
      symbolicLinks: {
        include: true,
        ignoreTargetContent: true,
        ignoreTargetPath: false,
        ignoreBasename: true,
      },
    };
    const actual = await hash('l2', options);
    const expected = toHash([resolvePath('folder/file')]);
    assert.strictEqual(actual.hash, expected);
  });

  it('will not fail if the target is missing', async () => {
    const options = {
      symbolicLinks: {
        include: true,
        ignoreTargetContent: true,
        ignoreTargetPath: false,
      },
    };
    let actual = await hash('l1', options);
    const expected = toHash(['l1', resolvePath('non-existing')]);
    assert.strictEqual(actual.hash, expected);
  });
});

describe('When symbolicLinks.include equals "resolve"', () => {
  const fs = Volume.fromJSON({ file: 'a' }, 'folder');
  fs.symlinkSync('non-existing', 'l1');
  fs.symlinkSync('folder/file', 'l2');
  fs.symlinkSync('folder', 'l3');
  const hash = prep(fs);

  function hashWithResolvedTargetPath(first, targetPath) {
    const withoutTargetPath = toHash(first);
    return toHash([withoutTargetPath, resolvePath(targetPath)]);
  }

  it('can create a hash over basename file content and target path', async () => {
    const options = {
      symbolicLinks: {
        include: true,
        ignoreTargetPath: false,
        ignoreBasename: false,
      },
    };

    const expected = hashWithResolvedTargetPath(['l2', 'a'], 'folder/file');
    let actual = await hash('l2', options);
    assert.strictEqual(actual.hash, expected);
  });

  it('can create a hash over target path and file content', async () => {
    const options1 = {
      // this will ignore all file basenames
      files: { ignoreBasename: true },
      symbolicLinks: {
        include: true,
        ignoreTargetPath: false,
      },
    };

    const expected = hashWithResolvedTargetPath(['a'], 'folder/file');
    const result1 = await hash('l2', options1);
    assert.strictEqual(result1.hash, expected);

    const options2 = {
      // this will only ignore symbolic link basenames
      files: { ignoreBasename: false },
      symbolicLinks: {
        include: true,
        ignoreTargetPath: false,
        ignoreBasename: true,
      },
    };
    const result2 = await hash('l2', options2);
    assert.strictEqual(result2.hash, result1.hash);
  });

  describe('Issue 41: Ignore missing symbolic link targets', () => {
    // Note: The different link types are only relevant on windows
    ['file', 'dir', 'junction'].map(linkType);
  });
});

function linkType(type) {
  describe(`If a "${type}" symlink target does not exist`, () => {
    it('should throw an ENOENT error with default options', async () => {
      const fs = new Volume.fromJSON({ file: 'content' });
      fs.symlinkSync('non-existing-file', 'soft-link', type);
      const hash = prep(fs);

      assert.rejects(hash('.'), { code: /ENOENT/ });
    });

    it('should hash only the name if ignoreTargetContentAfterError is true', async () => {
      const fs = Volume.fromJSON({ file: 'content' });
      fs.symlinkSync('non-existing-file', 'soft-link', type);
      const hash = prep(fs);
      const options = { symbolicLinks: { ignoreTargetContentAfterError: true } };

      const actual = await hash('.', options);
      assert(actual.children[1], 'Expected at least one child');
      assert.strictEqual(actual.children[1].hash, '2rAbS3Cr1VJjcXABKQhmBD2SS3s');
      assert.strictEqual(actual.hash, 'bxn8LngFvaQzWwEZtqXZc2_cxvw');
    });

    it('should hash the name and target path if configured', async () => {
      const fs = Volume.fromJSON({ file: 'content' });
      fs.symlinkSync('non-existing-file', 'soft-link', type);
      const hash = prep(fs);
      const options = {
        symbolicLinks: {
          ignoreTargetContentAfterError: true,
          ignoreTargetPath: false,
        },
      };

      const actual = await hash('soft-link', options);
      const expected = toHash(['soft-link', resolvePath('non-existing-file')]);
      assert.strictEqual(actual.hash, expected);
    });

    it('should hash the name if all symlink errors are ignored', async () => {
      const fs = Volume.fromJSON({ file: 'content' });
      fs.symlinkSync('non-existing-file', 'soft-link', type);
      const hash = prep(fs);
      const options = { symbolicLinks: { ignoreTargetContentAfterError: true } };

      const actual = await hash('soft-link', options);
      const expected = toHash(['soft-link']);
      assert.strictEqual(actual.hash, expected);
    });
  });
}

/* helpers */

function toHash(strings) {
  const hash = crypto.createHash(defaultOptions().algo);
  for (const str of strings) {
    hash.update(str);
  }
  return hash.digest(defaultOptions().encoding);
}

function resolvePath(string) {
  if (process.platform === 'win32') {
    return path.posix.resolve(string);
  } else {
    return path.resolve(string);
  }
}
