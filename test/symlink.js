const { prep, Volume } = require('./_common');

it('should follow a symbolic link', function () {
    const fs = Volume.fromJSON({ 'file': 'content' }, 'folder');
    fs.symlinkSync('folder/file', 'soft-link');
    const hash = prep(fs);

    return hash('.', { folders: { include: '*' }}).then(result => {
        const symlink = result.children[1];
        symlink.hash.should.equal('BQv/kSJnDNedkXlw/tpcXpf+Mzc=');
        const target = result.children[0].children[0];
        const msg = 'The symlink name is part of the hash, the symlink and its target must have different hashes';
        symlink.hash.should.not.equal(target.hash, msg);
    });
});
