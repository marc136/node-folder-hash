
const crypto = require('crypto'),
    path = require('path');

const hashFolder = require('../index.js');

console.log(`Known hash algorithms:\n'${crypto.getHashes().join(`', '`)}'\n`);

const dir = path.resolve(__dirname, '../');

hashFolder.hashElement('README.md', dir)
    .then(result => {
        console.log('\nCreated a hash over a single file:');
        console.log(result.toString());
    })
    .catch(reason => {
        console.error(`\nPromise rejected due to:\n${reason}\n\n`);
    });

hashFolder.hashElement(dir, {
    files: { exclude: ['.*'], matchBasename: true },
    folders: { include: ['examples', 'test'], matchBasename: true }
}, (err, result) => {
    if (err) {
        console.error(`\nFailed to create a hash due to:\n${err}`);
    } else {
        console.log('\nCreated a hash over a folder:');
        console.log(result.toString());
    }
});
