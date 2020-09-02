const { defaultOptions, prep, Volume } = require('./_common');
const crypto = require('crypto'),
  clone = require('clone'),
  path = require('path');

describe('When hashing a symbolic link', async function () {
  it('should follow a symbolic link follow=resolve (default)', function () {
    const fs = Volume.fromJSON({ file: 'content' }, 'folder');
    fs.symlinkSync('folder/file', 'soft-link');
    const hash = prep(fs);

    return hash('.', {}).then(result => {
      const symlink = result.children[1];
      // symlink.hash.should.equal(mkhash('soft-link', 'content'));
      symlink.hash.should.equal('BQv/kSJnDNedkXlw/tpcXpf+Mzc=');
      const target = result.children[0].children[0];
      const msg =
        'The symlink name is part of the hash, the symlink and its target must have different hashes';
      symlink.hash.should.not.equal(target.hash, msg);
    });
  });

  it('can skip symbolic links', function () {
    const fs = Volume.fromJSON({ file: 'a' }, 'folder');
    fs.symlinkSync('non-existing', 'l1');
    fs.symlinkSync('folder/file', 'l2');
    const hash = prep(fs);

    const options = { symbolicLinks: { include: false } };
    return Promise.all([
      hash('l1', options).should.eventually.be.undefined,
      hash('l2', options).should.eventually.be.undefined,
      hash('.', options)
        .then(result => result.children.length)
        .should.eventually.become(1),
    ]);
  });

  it('can ignore the target content', async function () {
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
    l1.hash.should.equal(expected.l1);
    const l2 = await hash('l2', options);
    l2.hash.should.equal(expected.l2);
  });
});

describe('Hashing the symlink to a folder and the folder should return the same hash when', function () {
  it('they have the same basename', async function () {
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
    actual.should.deep.equal(expected);
  });

  it('the basename is ignored', async function () {
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
    // the names will be different
    delete expected.name;
    delete actual.name;
    actual.should.deep.equal(expected);
  });
});

describe('When symbolicLinks.ignoreTargetContent is true', function () {
  const fs = Volume.fromJSON({ file: 'a' }, 'folder');
  fs.symlinkSync('non-existing', 'l1');
  fs.symlinkSync('folder/file', 'l2');
  fs.symlinkSync('folder', 'l3');
  const hash = prep(fs);

  it('hashes the name and target path', async function () {
    const options = {
      symbolicLinks: {
        include: true,
        ignoreTargetContent: true,
        ignoreTargetPath: false,
      },
    };
    let result = await hash('l2', options);
    const expected = toHash(['l2', path.resolve('folder/file')]);
    return result.hash.should.equal(expected);
  });

  it('hashes the target path', async function () {
    const options = {
      symbolicLinks: {
        include: true,
        ignoreTargetContent: true,
        ignoreTargetPath: false,
        ignoreBasename: true,
      },
    };
    let result = await hash('l2', options);
    const expected = toHash([path.resolve('folder/file')]);
    return result.hash.should.equal(expected);
  });

  it('will not fail if the target is missing', async function () {
    const options = {
      symbolicLinks: {
        include: true,
        ignoreTargetContent: true,
        ignoreTargetPath: false,
      },
    };
    let result = await hash('l1', options);
    const expected = toHash(['l1', path.resolve('non-existing')]);
    return result.hash.should.equal(expected);
  });
});

describe('When symbolicLinks.include equals "resolve"', function () {
  const fs = Volume.fromJSON({ file: 'a' }, 'folder');
  fs.symlinkSync('non-existing', 'l1');
  fs.symlinkSync('folder/file', 'l2');
  fs.symlinkSync('folder', 'l3');
  const hash = prep(fs);

  function hashWithResolvedTargetPath(first, targetPath) {
    const withoutTargetPath = toHash(first);
    return toHash([withoutTargetPath, path.resolve(targetPath)]);
  }

  it('can create a hash over basename file content and target path', async function () {
    const options = {
      symbolicLinks: {
        include: true,
        ignoreTargetPath: false,
        ignoreBasename: false,
      },
    };

    const expected = hashWithResolvedTargetPath(['l2', 'a'], 'folder/file');
    let result = await hash('l2', options);
    return result.hash.should.equal(expected);
  });

  it('can create a hash over target path and file content', async function () {
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
    result1.hash.should.equal(expected);

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
    return result2.hash.should.equal(result1.hash);
  });

  describe('Issue 41: Ignore missing symbolic link targets', async function () {
    // Note: The different link types are only relevant on windows
    await ['file', 'dir', 'junction'].map(linkType);
  });
});

function linkType(type) {
  describe(`If a "${type}" symlink target does not exist`, function () {
    it('should throw an ENOENT error with default options', function () {
      const fs = new Volume.fromJSON({ file: 'content' });
      fs.symlinkSync('non-existing-file', 'soft-link', type);
      const hash = prep(fs);

      const expected = /ENOENT/;
      return hash('.').should.eventually.be.rejectedWith(expected);
    });

    it('should hash only the name if ignoreTargetContentAfterError is true', function () {
      const fs = Volume.fromJSON({ file: 'content' });
      fs.symlinkSync('non-existing-file', 'soft-link', type);
      const hash = prep(fs);
      const options = { symbolicLinks: { ignoreTargetContentAfterError: true } };

      return hash('.', options).then(result => {
        result.children[1].hash.should.equal('2rAbS3Cr1VJjcXABKQhmBD2SS3s=');
        result.hash.should.equal('EYegpWpT309Zil1L80VZMTy6UZc=');
      });
    });

    it('should hash the name and target path if configured', function () {
      const fs = Volume.fromJSON({ file: 'content' });
      fs.symlinkSync('non-existing-file', 'soft-link', type);
      const hash = prep(fs);
      const options = {
        symbolicLinks: {
          ignoreTargetContentAfterError: true,
          ignoreTargetPath: false,
        },
      };

      return hash('soft-link', options).then(result => {
        const expected = toHash(['soft-link', path.resolve('non-existing-file')]);
        result.hash.should.equal(expected);
      });
    });

    it('should hash the name if all symlink errors are ignored', function () {
      const fs = Volume.fromJSON({ file: 'content' });
      fs.symlinkSync('non-existing-file', 'soft-link', type);
      const hash = prep(fs);
      const options = { symbolicLinks: { ignoreTargetContentAfterError: true } };

      return hash('soft-link', options).then(result => {
        const expected = toHash(['soft-link']);
        result.hash.should.equal(expected);
      });
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
