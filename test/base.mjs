import assert from 'node:assert';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import { prep, Volume, inspect } from './_common.mjs';

describe('Should generate hashes', () => {
  const json = {};
  const dir = 'folder',
    basename = 'file1';
  json[path.join(dir, basename)] = 'file content';
  const hashElement = prep(Volume.fromJSON(json));

  const checkHash = result => {
    assert(result, 'Result should exist');
    assert(result.hash, 'Result hash should exist');
    assert.strictEqual(result.hash, '11OqJSEmDW280Sst6dycitwlfCI');
  };

  describe('when called as a promise', () => {
    it('with element and folder passed as two strings', async () => {
      return checkHash(await hashElement(path.join(dir, basename)));
    });

    it('with element path passed as one string', async () => {
      return checkHash(await hashElement(path.join(dir, basename)));
    });

    it('with options passed', async () => {
      const options = {
        algo: 'sha1',
        encoding: 'base64url',
        excludes: [],
        match: {
          basename: false,
          path: false,
        },
      };
      const result = await hashElement(basename, dir, options);
      checkHash(result);
    });

    it('with algoOptions passed', () => {
      const checkAlgoOptionHash = result => {
        assert(result, 'Result should exist');
        assert(result.hash, 'Result hash should exist');
        assert.strictEqual(result.hash, 'd89f885449');
      };

      var options = {
        algo: 'shake256',
        algoOptions: { outputLength: 5 },
        encoding: 'hex',
        excludes: [],
        match: {
          basename: false,
          path: false,
        },
      };
      return hashElement(basename, dir, options).then(checkAlgoOptionHash);
    });
  });

  describe('when executed with an error-first callback', () => {
    it('with element and folder passed as two strings', () => {
      return hashElement(basename, dir, (err, result) => {
        assert.ifError(err);
        checkHash(result);
      });
    });

    it('with element path passed as one string', () => {
      return hashElement(path.join(dir, basename), (err, result) => {
        assert.ifError(err);
        checkHash(result);
      });
    });

    it('with options passed', () => {
      var options = {
        algo: 'sha1',
        encoding: 'base64url',
        excludes: [],
        match: {
          basename: false,
          path: false,
        },
      };
      return hashElement(path.join(dir, basename), options, (err, result) => {
        assert.ifError(err);
        checkHash(result);
      });
    });
  });

  describe('and', () => {
    it('should return a string representation', async () => {
      const fs = Volume.fromJSON({ 'folder/file.txt': 'content' });
      fs.mkdirSync('folder/empty_folder');

      const hash = prep(fs);
      const result = await hash('folder');
      assert(result, 'Hash should exist');
      const str = result.toString();
      assert(str, 'String representation of hash should exist');
      assert.strictEqual(str.length > 10, true, 'String length should be greater than 10');
    });
  });
});
