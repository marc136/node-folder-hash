/**
 * Shows how the exclude option can be used with a function.
 *
 * Real-life usage could be to exclude gitignored files
 */

import { hashElement } from 'folder-hash';
import ignore from 'ignore';
import { readFileSync } from 'node:fs';

const gitignoreContents = readFileSync('../.gitignore').toString().split('\n');
const ig = ignore().add(gitignoreContents);

function shouldExclude(name) {
  return ig.ignores(name);
}

hashElement('../', {
  files: {
    exclude: shouldExclude,
  },
  folders: {
    exclude: shouldExclude,
  },
}).then(hash => {
  console.log('hash of everything that is not gitignored: ', hash);
});
