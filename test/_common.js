const { Volume } = require('memfs'),
    assert = require('assert'),
    chai = require('chai'),
    chaiAsPromised = require('chai-as-promised'),
    should = chai.should(),
    inspect = obj => console.log(require('util').inspect(obj, false, null));

chai.use(chaiAsPromised);

const folderHash = require('../index'),
    prep = volume => folderHash.prep(volume, Promise);

module.exports = {
    folderHash, prep, Volume, chai, should, inspect
}
