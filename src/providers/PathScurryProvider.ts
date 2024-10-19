import fs from 'fs';
import { inject, injectable } from 'inversify';
import { Provider } from '.';
import { TYPES } from '../TYPES';
import { PathScurryWin32, PathScurryDarwin, PathScurryPosix, PathScurry } from 'path-scurry';

@injectable()
export class PathScurryProvider extends Provider<PathScurry> {

  constructor(@inject(TYPES.BaseDirProvider) private readonly baseDir: Provider<string>) { super(); }

  async provider() {
    const baseDir = await this.baseDir.get();
    const Scurry =
      process.platform === 'win32' ? PathScurryWin32
        : process.platform === 'darwin' ? PathScurryDarwin
          : process.platform ? PathScurryPosix
            : PathScurry;

    return new Scurry(baseDir, {
      childrenCacheSize: 32 * 1024,
      // TODO - Consider potential impacts of using this on case sensitive file systems
      nocase: true,
      // Required to wire up mocks properly
      fs: fs
    });
  }


}