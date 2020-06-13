const { prep, Volume } = require('./_common');

describe('If a symlink target does not exist', function () {
    it('should throw an ENOENT error with default options', function () {
        const fs = Volume.fromJSON({ 'file': 'content' }, 'folder');
        fs.symlinkSync('non-existing-file', 'soft-link');
        const hash = prep(fs);

        const expected = 'ENOENT: no such file or directory, stat \'soft-link\'';
        return hash('.').should.eventually.be.rejectedWith(expected);
    });

    it('should hash the name if `ignoreMissingSymlink=true`', function () {
        const fs = Volume.fromJSON({ 'file': 'content' }, 'folder');
        fs.symlinkSync('non-existing-file', 'soft-link');
        const hash = prep(fs);

        return hash('.', { ignoreMissingSymLinks: true }).then(result => {
            result.children[1].hash.should.equal('2rAbS3Cr1VJjcXABKQhmBD2SS3s=');
            result.hash.should.equal('lGA66Gdtt7YF6wp4oWOwHSezcMg=');
        });
    });
});
