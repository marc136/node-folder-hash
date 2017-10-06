// execute from the base folder
//  node examples\readme-with-callbacks.js

var hasher = require('../index.js');

// pass element name and folder path separately
hasher.hashElement('node_modules', __dirname).then(function (hash) {
    console.log('Result for folder "node_modules" in directory "' + __dirname + '":');
    console.log(hash.toString());
});

// pass element path directly
hasher.hashElement(__dirname).then(function (hash) {
    console.log('Result for folder "' + __dirname + '":');
    console.log(hash.toString());
});

// pass options (example: exclude dotFiles)
var options = { excludes: ['.*'], match: { basename: true, path: false } };
hasher.hashElement(__dirname, options)
.then(function (hash) {
  console.log('Result for folder "' + __dirname + '":');
  console.log(hash.toString());
})
.catch(function (error) {
  return console.error('hashing failed:', error);
});
