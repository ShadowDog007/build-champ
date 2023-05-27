import glob, { IOptions } from 'glob';
import { inject, injectable } from 'inversify';
import { join } from 'path';
import 'reflect-metadata';
import { Provider } from '../providers';
import { TYPES } from '../TYPES';

export type EnabledGlobOptions = Pick<IOptions, 'cwd' | 'dot' | 'ignore' | 'nocase'>;

export interface GlobService {
  glob(pattern: string, options?: EnabledGlobOptions): Promise<string[]>;
}

@injectable()
export class GlobServiceImpl implements GlobService {

  constructor(@inject(TYPES.BaseDirProvider) private readonly baseDir: Provider<string>) { }

  async glob(pattern: string, options?: EnabledGlobOptions): Promise<string[]> {
    const baseDir = await this.baseDir.get();
    const matches = await GlobServiceImpl.globAsync(pattern, {
      ...options,
      cwd: options?.cwd ? join(baseDir, options.cwd) : baseDir,
    });

    return options?.cwd
      ? matches
      : matches.map(m => `/${m}`);
  }

  static globAsync(pattern: string, options: EnabledGlobOptions) {
    return new Promise<string[]>((resolve, error) => {
      glob(pattern, options,
        (err, matches) => err ? error(err) : resolve(matches));
    });
  }
}
