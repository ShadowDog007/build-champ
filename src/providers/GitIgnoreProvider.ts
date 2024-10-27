import { inject, injectable } from 'inversify';
import { Provider } from '.';
import { TYPES } from '../TYPES';
import { PathScurry } from 'path-scurry';
import { globIterateSync } from 'glob';
import { FileService } from '../services/FileService';
import { dirname } from 'path';
import { Minimatch } from 'minimatch';

export interface GitIgnore {
  matchIgnore(relativePath: string): boolean;
  matchIgnoreChildren(relativePath: string): boolean;
}

@injectable()
export class GitIgnoreProvider extends Provider<GitIgnore> {

  constructor(
    @inject(TYPES.BaseDirProvider) private readonly baseDir: Provider<string>,
    @inject(TYPES.PathScurryProvider) private readonly pathScurry: Provider<PathScurry>,
    @inject(TYPES.FileService) private readonly fileService: FileService
  ) {
    super();
  }

  async provider() {
    const gitIgnore = new GitIgnoreImpl(this.fileService);

    const gitIgnoreFiles = globIterateSync('**/.gitignore', {
      cwd: await this.baseDir.get(),
      ignore: {
        ignored(p) {
          return gitIgnore.matchIgnore(p.relative());
        },
        childrenIgnored(p) {
          return gitIgnore.matchIgnoreChildren((p.relative() || '.') + '/');
        }
      },
      scurry: (await this.pathScurry.get()) as unknown as undefined
    });

    for (const gitIgnoreFile of gitIgnoreFiles) {
      // Add ignores as we find them to avoid traversing into ignored dirs searching for more .gitignores
      await gitIgnore.addGitIgnore(gitIgnoreFile);
    }

    return gitIgnore;
  }
}


export class GitIgnoreImpl implements GitIgnore {

  private readonly ignore: Minimatch[] = [];
  private readonly notIgnore: Minimatch[] = [];

  private readonly ignoreChildren: Minimatch[] = [new Minimatch('.git/**', { optimizationLevel: 2 })];
  private readonly notIgnoreChildren: Minimatch[] = [];

  constructor(private readonly fileService: FileService) { }

  async addGitIgnore(gitIgnorePath: string) {
    const gitIgnoreDir = dirname(gitIgnorePath);
    const rootPath = gitIgnoreDir === '.' ? '' : gitIgnoreDir + '/';

    for await (let line of this.fileService.readFileUtf8Lines(gitIgnorePath)) {
      if (line[0] === '#') continue;
      line = line.trim();
      if (line === '') continue;

      const not = line.startsWith('!');
      const slashIndex = line.indexOf('/');
      const relative = slashIndex >= 0 && slashIndex !== (line.length - 1);
      const children = line.endsWith('/');

      let pattern = not ? line.substring(1) : line;
      pattern = relative
        ? `${rootPath}${pattern}`
        : `${rootPath}**/${pattern}`;
      if (children) {
        pattern = `${pattern}**`;
      }

      const c = new Minimatch(pattern, { optimizationLevel: 2 });

      if (not) this.notIgnoreChildren.push(c);
      else this.ignoreChildren.push(c);

      if (!children) {
        if (not) this.notIgnore.push(c);
        else this.ignore.push(c);
      }
    }
  }

  matchIgnore(relativePath: string) {
    for (const notIgnore of this.notIgnore) {
      if (notIgnore.match(relativePath)) {
        return false;
      }
    }
    for (const ignore of this.ignore) {
      if (ignore.match(relativePath)) {
        return true;
      }
    }
    return false;
  }
  matchIgnoreChildren(relativePath: string): boolean {
    for (const notIgnore of this.notIgnoreChildren) {
      if (notIgnore.match(relativePath))
        return false;
    }
    for (const ignore of this.ignoreChildren) {
      if (ignore.match(relativePath))
        return true;
    }
    return false;
  }
}