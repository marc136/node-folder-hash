// execute from the base folder
//  node examples\readme-with-callbacks.js

const path = require('path');
const { hashElement } = require('../index.js');

// pass element name and folder path separately
hashElement('test', path.join(__dirname, '..'), (error, hash) => {
    if (error) return console.error('hashing failed:', error);
    console.log('Result for folder "../test":', hash.toString());
});

// pass element path directly
hashElement(__dirname, (error, hash) => {
    if (error) return console.error('hashing failed:', error);
    console.log('Result for folder "' + __dirname + '":');
    console.log(hash.toString());
});

// pass options (example: exclude dotFiles)
const options = { algo: 'md5', excludes: ['**/.*'], match: { basename: false, path: true } };
hashElement(__dirname, options, (error, hash) => {
    if (error) return console.error('hashing failed:', error);
    console.log('Result for folder "' + __dirname + '":');
    console.log(hash.toString());
});
