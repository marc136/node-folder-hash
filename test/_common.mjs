import { Volume } from 'memfs';
import { inspect as inspect1 } from 'node:util';
import { prep, default as folderHash } from '../index.mjs';

const inspect = obj => console.log(inspect1(obj, false, null));

const defaultOptions = () => structuredClone(folderHash.defaults);

export { folderHash, prep, Volume, inspect, defaultOptions };
