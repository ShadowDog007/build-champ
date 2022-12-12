import { PathLike } from 'fs';
import { fs } from 'memfs';
import { IMkdirOptions, IReadFileOptions, IWriteFileOptions } from 'memfs/lib/volume';

export const readFile = async (path: PathLike, options: unknown) => fs.readFileSync(path, options as string | IReadFileOptions | undefined);
export const writeFile = async (path: PathLike, data: string | Buffer, options: unknown) => fs.writeFileSync(path, data, options as IWriteFileOptions);

export const stat = async (path: PathLike) => fs.statSync(path);

export const mkdir = async (path: PathLike, options: IMkdirOptions) => fs.mkdirSync(path, options);
