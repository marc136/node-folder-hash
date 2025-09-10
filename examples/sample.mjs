import { hashElement } from 'folder-hash';
import { getHashes } from 'node:crypto';
import * as path from 'node:path';

console.log(`Known hash algorithms:\n'${getHashes().join(`', '`)}'\n`);

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const dir = path.resolve(__dirname, '../');

hashElement('README.md', dir)
  .then(result => {
    console.log('\nCreated a hash over a single file:');
    console.log(result.toString());
  })
  .catch(reason => {
    console.error(`\nPromise rejected due to:\n${reason}\n\n`);
  });

hashElement(
  dir,
  {
    files: { exclude: ['.*'], matchBasename: true },
    folders: { include: ['examples', 'test'], matchBasename: true },
  },
  (err, result) => {
    if (err) {
      console.error(`\nFailed to create a hash due to:\n${err}`);
    } else {
      console.log('\nCreated a hash over a folder:');
      console.log(result.toString());
    }
  },
);
