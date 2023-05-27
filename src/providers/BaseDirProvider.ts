import { statSync } from 'fs';
import { injectable } from 'inversify';
import { dirname, join } from 'path';
import 'reflect-metadata';
import { Provider } from '.';

@injectable()
export class BaseDirProvider extends Provider<string> {

  // TODO - Should this just use the current CWD ?
  async provider() {
    let dir = process.cwd();

    while (!this.exists(join(dir, '.git'))) {
      const parentDir = dirname(dir);
      if (dir === parentDir) {
        throw new Error(`Can't find base dir in ${process.cwd()}`);
      }
      dir = parentDir;
    }

    return dir;
  }

  private exists(path: string) {
    try {
      statSync(path);
      return true;
    } catch {
      return false;
    }
  }
}
