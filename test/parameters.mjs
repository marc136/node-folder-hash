/**
 * This file tests the parameters
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { parseParameters, hashElement } from '../index.mjs';

describe('Initialization', function () {
  function checkError(err) {
    assert(err, 'Should have passed an error');
    assert.strictEqual(err.name, 'TypeError');
    assert.strictEqual(err.message, 'First argument must be a string');
  }

  it('should reject if no name was passed', async () => {
    const result = await hashElement().catch(checkError);
    assert.ifError(result);
  });

  it('should call an error callback if no name was passed', () => {
    return hashElement(err => {
      checkError(err);
    });
  });
});

describe('Parse parameters', function () {
  it('should not change the supplied options object', async () => {
    const params = {
      algo: 'some',
      files: { exclude: ['abc', 'def'], include: [] },
      folders: { exclude: [], include: ['abc', 'def'] },
      match: { basename: false, path: 'true' },
    };
    const expected = JSON.stringify(params);
    await parseParameters('abc', params);
    const actual = JSON.stringify(params);
    assert.strictEqual(actual, expected);
  });

  it('should parse an empty exclude array to undefined', async () => {
    const params = {
      algo: 'some',
      files: { exclude: [] },
      match: { basename: false, path: 'true' },
    };

    const parsed = await parseParameters('abc', params);
    assert(parsed.options.files, 'files options should exist');
    assert.strictEqual(parsed.options.files.exclude, undefined);
  });

  it('should default excludes to undefined', async () => {
    const parsed = await parseParameters('abc', { files: undefined });

    assert(parsed.options.folders, 'folders options should exist');
    assert.strictEqual(parsed.options.folders.exclude, undefined);
  });
});
