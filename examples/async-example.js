
const { Volume } = require('memfs'),
    prep = volume => require('../index').prep(volume, Promise);

const hashElement = prep(Volume.fromJSON({
    'abc.txt': 'awesome content',
    'def/ghi.js': 'awesome content',
}));

async function example() {
    const options = {  files: { ignoreRootName: true } };

    const abc = await hashElement('abc.txt', options);
    const def = await hashElement('def/ghi.js', options);

    console.log(`abc.hash == def.hash ? ${abc.hash === def.hash}`);
    console.log(` abc.hash ${abc.hash}\n def.hash ${def.hash}`);
}

example();
