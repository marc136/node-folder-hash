// execute from the base folder
//  node examples\readme-with-promises.js

const path = require('path');
const { hashElement } = require('../index.js');

// pass element name and folder path separately
hashElement('test', path.join(__dirname, '..'))
  .then(hash => {
    console.log('Result for folder "../test":', hash.toString(), '\n');
  })
  .catch(error => {
    return console.error('hashing failed:', error);
  });

// pass element path directly
hashElement(__dirname)
  .then(hash => {
    console.log(`Result for folder "${__dirname}":`);
    console.log(hash.toString(), '\n');
  })
  .catch(error => {
    return console.error('hashing failed:', error);
  });

// pass options (example: exclude dotFolders)
const options = { encoding: 'hex', folders: { exclude: ['.*'] } };
hashElement(__dirname, options)
  .then(hash => {
    console.log('Result for folder "' + __dirname + '" (with options):');
    console.log(hash.toString(), '\n');
  })
  .catch(error => {
    return console.error('hashing failed:', error);
  });
