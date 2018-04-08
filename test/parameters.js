/**
 * This file tests the parameters
 */

const folderHash = require('../index'),
    assert = require('assert'),
    chai = require('chai'),
    chaiAsPromised = require('chai-as-promised');


chai.use(chaiAsPromised);
const should = chai.should();

describe('Initialization', function () {
    function checkError(err) {
        err.name.should.equal('TypeError');
        err.message.should.equal('First argument must be a string');
    }

    it('should reject if no name was passed', function () {
        return folderHash.hashElement()
            .then(result => { throw new Error(result); })
            .catch(checkError)
    });

    it('should call an error callback if no name was passed', function () {
        return folderHash.hashElement(err => {
            should.exist(err);
            checkError(err);
        });
    });
});

describe('Parse parameters', function () {
    it('should not change the supplied options object', function () {
        const params = {
            algo: 'some', excludes: ['abc', 'def'],
            match: { basename: false, path: 'true' }
        };
        const str = JSON.stringify(params)

        return folderHash.parseParameters('abc', params)
            .then(() => JSON.stringify(params).should.equal(str))
    });

    it('should parse an empty excludes array to undefined', function () {
        const params = {
            algo: 'some', excludes: [],
            match: { basename: false, path: 'true' }
        };

        return folderHash.parseParameters('abc', params)
            .then(parsed => should.equal(parsed.excludes, undefined));
    });

    it('should default excludes to undefined', function () {
        return folderHash.parseParameters('abc', { excludes: undefined })
            .then(parsed => should.equal(parsed.excludes, undefined));
    });
})
