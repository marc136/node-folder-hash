const { Volume } = require('memfs'),
  assert = require('assert'),
  chai = require('chai'),
  chaiAsPromised = require('chai-as-promised'),
  should = chai.should(),
  inspect = obj => console.log(require('util').inspect(obj, false, null));

chai.use(chaiAsPromised);

const folderHash = require('../index'),
  prep = volume => folderHash.prep(volume);

const defaultOptions = () => structuredClone(folderHash.defaults);

module.exports = {
  folderHash,
  prep,
  Volume,
  chai,
  should,
  inspect,
  defaultOptions,
};
