import { hashElement } from 'folder-hash';
import * as path from 'node:path';
const __dirname = path.dirname(new URL(import.meta.url).pathname);

// pass element name and folder path separately
hashElement('test', path.join(__dirname, '..'))
  .then(hash => {
    console.log('Result for folder "../test":', hash.toString(), '\n');
  })
  .catch(error => {
    return console.error('hashing failed:', error);
  });

// pass full element path and options
const options = {
  encoding: 'hex',
  folders: { exclude: ['node_modules'] },
};
hashElement(__dirname, options)
  .then(hash => {
    console.log('Result for folder "' + __dirname + '" (with options):');
    console.log(hash.toString(), '\n');
  })
  .catch(error => {
    return console.error('hashing failed:', error);
  });
