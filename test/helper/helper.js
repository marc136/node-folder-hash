/**
 * TODO remove this file and add the creation of folders and files to the tests
 */

var path = require('path');

module.exports = { createTestFolderStructure }

/**
 * structure created:
 * sample-folder
 * - file1
 * - file2
 * - subfolder1
 *   - file1
 *   - file2
 * - f2
 *   - afile
 *   - subfolder1
 *     - file1
 *     - file2
 */
function createTestFolderStructure(vol, fs, sampleFolder) {
    var content1 = 'Hello this is some sample text.\nWith two lines';

    function ignoreExistsError(err) {
        if (err && err.code !== 'EEXIST') {
            throw new Error('Could not write to file system');
        }
    }

    function dummyFolder(basepath) {
        const json = {}
        json[path.join(basepath, 'file1')] = content1
        json[path.join(basepath, 'file2')] = content1

        vol.fromJSON(json)
    }

    function mkdirSync(folderpath) {
        return ignoreExistError(fs.mkdirSync, folderpath);
    }

    function writeFileSync(filepath, content) {
        return ignoreExistError(fs.writeFileSync, filepath, content);
    }

    return function () {
        dummyFolder(sampleFolder);
        dummyFolder(path.join(sampleFolder, 'subfolder1'));

        mkdirSync(path.join(sampleFolder, 'f2'));
        writeFileSync(path.join(sampleFolder, 'f2', 'file1'), 'another text');
        dummyFolder(path.join(sampleFolder, 'f2', 'subfolder1'));
        dummyFolder(path.join(sampleFolder, 'f2', 'subfolder2'));

        mkdirSync(path.join(sampleFolder, 'f3'));
        dummyFolder(path.join(sampleFolder, 'f3', 'subfolder1'))
        writeFileSync(path.join(sampleFolder, 'f3', 'subfolder1', 'file1'), 'This is another text');

        mkdirSync(path.join(sampleFolder, 'empty'));
    }
}


function ignoreExistError(fn, arg, arg) {
    var args = Array.from ? Array.from(arguments) : Array.prototype.slice.call(arguments)
    args.splice(0, 1);

    if (typeof fn !== 'function') throw new Error('The first argument must be of type function');

    try {
        var result = fn.apply(null, args);
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
    return result;
}
