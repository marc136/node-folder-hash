/**
 * Shows how the ignoreRootName option can be used.
 *
 * Real-life usage could be to compare
 *  - two folders with the same content but different names (e.g. for backups)
 *  - if two files have the same content
 */

import { hashElement } from 'folder-hash';

async function folder(f) {
  await hashElement(f, { folders: { ignoreRootName: false } }).then(hash => {
    console.log(`hash of folder ${f} when name is not ignored:`, hash);
  });

  await hashElement(f, { folders: { ignoreRootName: true } }).then(hash => {
    console.log(`hash of folder ${f} when ignoring its name:`, hash);
  });
}

async function file() {
  const f = 'ignore-rootName.mjs';
  console.log('\n---\n');

  await hashElement(f, { files: { ignoreRootName: false } }).then(hash => {
    console.log(`default hash of file:`, hash);
  });

  await hashElement(f, { files: { ignoreRootName: true } }).then(hash => {
    console.log(`hash of file when ignoring its name:`, hash);
  });
}

folder('../test').then(file);
