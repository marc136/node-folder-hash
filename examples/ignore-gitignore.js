/**
 * Shows how the exclude option can be used with a function.
 * 
 * Real-life usage could be to exclude gitignored files
 */

const { hashElement } = require('../index');
const fs = require('fs');
const ignore = require('ignore');

const gitignoreContents = fs.readFileSync('../.gitignore').toString().split('\n');
const ig = ignore().add(gitignoreContents);

function shouldExclude(name) {
  return ig.ignores(name);
}

hashElement('../', {
  files: {
    exclude: shouldExclude
  },
  folders: {
    exclude: shouldExclude
  }
}).then(hash => {
  console.log('hash of everything that is not gitignored: ', hash)
});
