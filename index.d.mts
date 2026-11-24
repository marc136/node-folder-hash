import type { HashedElement, Options } from './types/public';
import type { ParsedArgs } from './types/internal';
/**
 * @param {typeof import("node:fs")} fs
 */
export declare function prep(fs: typeof import("node:fs")): (name: string, dir: string, options: Options, callback: (err?: Error, ok?: unknown) => void) => Promise<void | HashedElement>;
/**
 * @param {IArguments | Array<string|Options>} args
 * @returns {Promise<ParsedArgs>}
 */
export declare function parseParameters(args: IArguments | Array<string | Options>): Promise<ParsedArgs>;
export declare const hashElement: (name: string, dir: string, options: Options, callback: (err?: Error, ok?: unknown) => void) => Promise<void | HashedElement>;
declare const _default: {
    defaults: Options;
    hashElement: (name: string, dir: string, options: Options, callback: (err?: Error, ok?: unknown) => void) => Promise<void | HashedElement>;
};
export default _default;
