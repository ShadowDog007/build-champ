import { MakeDirectoryOptions, PathLike, WriteFileOptions } from 'fs';
import { fs } from 'memfs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readFile = async (path: PathLike, options: unknown) => fs.readFileSync(path, options as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const writeFile = async (path: PathLike, data: string | Buffer, options: unknown) => fs.writeFileSync(path, data, options as any);

export const stat = async (path: PathLike) => fs.statSync(path);

export const mkdir = async (path: PathLike, options: MakeDirectoryOptions) => fs.mkdirSync(path, options as Parameters<typeof fs.mkdirSync>[1]);

// Used by PathScurry
export const lstat = async (path: string) => fs.lstatSync(path);
export const readdir = async (path: string) => fs.readdirSync(path);
export const readlink = async (path: string) => fs.readlinkSync(path);
export const realpath = async (path: string) => fs.realpathSync(path);
