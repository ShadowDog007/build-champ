import { globIterate, GlobOptions } from 'glob';
import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { Provider } from '../providers';
import { TYPES } from '../TYPES';
import { Minimatch } from 'minimatch';
import { PathScurry } from 'path-scurry';
import { GitIgnore } from '../providers/GitIgnoreProvider';

export type EnabledGlobOptions = Pick<GlobOptions, 'dot' | 'nocase'> & { ignore?: string[]; };

export interface GlobService {
  glob(pattern: string | string[], options?: EnabledGlobOptions): AsyncGenerator<string>;
  globList(pattern: string | string[], options?: EnabledGlobOptions): Promise<string[]>;
}

@injectable()
export class GlobServiceImpl implements GlobService {
  constructor(
    @inject(TYPES.BaseDirProvider) private readonly baseDir: Provider<string>,
    @inject(TYPES.PathScurryProvider) private readonly pathScurry: Provider<PathScurry>,
    @inject(TYPES.GitIgnoreProvider) private readonly gitIgnore: Provider<GitIgnore>
  ) { }

  async *glob(pattern: string | string[], options?: EnabledGlobOptions): AsyncGenerator<string> {
    const baseDir = await this.baseDir.get();

    const ignore = options?.ignore?.map(l => new Minimatch(l, { optimizationLevel: 2 })) ?? [];
    const gitIgnore = await this.gitIgnore.get();

    function childChecks(pattern: string): boolean {
      return !pattern.startsWith('!') && pattern.endsWith('/**');
    }

    const ignoreFile = ignore.filter(i => !childChecks(i.pattern));
    const ignoreChildren = ignore.filter(i => childChecks(i.pattern));

    const matchesIterator = globIterate(pattern, {
      ...options,
      scurry: (await this.pathScurry.get()) as unknown as undefined,
      cwd: baseDir,
      nodir: true,
      ignore: {
        ignored(p) {
          const relative = p.relative();
          if (gitIgnore.matchIgnore(relative))
            return true;

          for (const i of ignoreFile) {
            if (i.match(relative)) {
              return true;
            }
          }
          return false;
        },
        childrenIgnored(p) {
          const relative = (p.relative() || '.') + '/';
          if (gitIgnore.matchIgnoreChildren(relative))
            return true;

          for (const i of ignoreChildren) {
            if (i.match(relative)) {
              return true;
            }
          }
          return false;
        }
      },
    });

    for await (let match of matchesIterator) {
      match = match.replaceAll('\\', '/');
      if (match[0] !== '/')
        match = `/${match}`;
      yield match;
    }
  }

  async globList(pattern: string, options?: EnabledGlobOptions) {
    const matches: string[] = [];

    for await (const match of this.glob(pattern, options)) {
      matches.push(match);
    }

    return matches;
  }
}
