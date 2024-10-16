import { PathLike } from 'fs';
import { fs } from 'memfs';
import { IMkdirOptions, IReadFileOptions, IWriteFileOptions } from 'memfs/lib/node/types/options';

export const readFile = async (path: PathLike, options: unknown) => fs.readFileSync(path, options as string | IReadFileOptions | undefined);
export const writeFile = async (path: PathLike, data: string | Buffer, options: unknown) => fs.writeFileSync(path, data, options as IWriteFileOptions);

export const stat = async (path: PathLike) => fs.statSync(path);

export const mkdir = async (path: PathLike, options: IMkdirOptions) => fs.mkdirSync(path, options);

// Used by PathScurry
export const lstat = async (path: string) => fs.lstatSync(path);
export const readdir = async (path: string) => fs.readdirSync(path);
export const readlink = async (path: string) => fs.readlinkSync(path);
export const realpath = async (path: string) => fs.realpathSync(path);
