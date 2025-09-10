import { hashElement } from 'folder-hash';
import * as path from 'node:path';
const __dirname = path.dirname(new URL(import.meta.url).pathname);

// pass element name and folder path separately
hashElement('test', path.join(__dirname, '..'), (error, hash) => {
  if (error) {
    return console.error('hashing failed:', error);
  } else {
    console.log('Result for folder "../test":', hash.toString(), '\n');
  }
});

// pass full element path and options
const options = {
  algo: 'md5',
  folders: { exclude: ['node_modules'] },
};
hashElement(__dirname, options, (error, hash) => {
  if (error) {
    return console.error('hashing failed:', error);
  } else {
    console.log('Result for folder "' + __dirname + '":');
    console.log(hash.toString());
  }
});
