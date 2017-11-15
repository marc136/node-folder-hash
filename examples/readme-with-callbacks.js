// execute from the base folder
//  node examples\readme-with-callbacks.js

var hasher = require('../index.js');

// pass element name and folder path separately
hasher.hashElement('node_modules', __dirname, function (error, hash) {
    if (error) return console.error('hashing failed:', error);
    console.log('Result for folder "node_modules" in directory "' + __dirname + '":');
    console.log(hash.toString());
});

// pass element path directly
hasher.hashElement(__dirname, function (error, hash) {
    if (error) return console.error('hashing failed:', error);
    console.log('Result for folder "' + __dirname + '":');
    console.log(hash.toString());
});

// pass options (example: exclude dotFiles)
var options = { excludes: ['**/.*'], match: { basename: false, path: true } };
hasher.hashElement(__dirname, options, function (error, hash) {
    console.log('Result for folder "' + __dirname + '":');
    console.log(hash.toString());
});
