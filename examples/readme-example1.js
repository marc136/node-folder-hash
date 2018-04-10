// execute from the base folder
//  node examples\readme-example1.js

const { hashElement } = require('../index.js');

const options = {
    folders: { exclude: ['.*', 'node_modules', 'test_coverage'] },
    files: { include: ['*.js', '*.json'] }
};

const options2 = {
    folders: {
        exclude: ['.*', '**.*', '**node_modules', '**test_coverage'],
        matchBasename: false, matchPath: true
    },
    files: {
        //include: ['**.js', '**.json' ], // Windows
        include: ['*.js', '**/*.js', '*.json', '**/*.json'], // *nix
        matchBasename: false, matchPath: true
    }
};

console.log('Creating a hash over the current folder:');
hashElement('.', options)
    .then(hash => {
        console.log(hash.toString(), '\n');
    })
    .catch(error => {
        return console.error('hashing failed:', error);
    });
