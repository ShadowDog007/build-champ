import { statSync } from 'fs';
import { injectable } from 'inversify';
import { dirname, join } from 'path';
import 'reflect-metadata';
import { ValueProvider } from '.';

@injectable()
export class BaseDirProvider extends ValueProvider<string> {

  constructor() {
    super(async () => this.findBaseDir());
  }

  // TODO - Should this just use the current CWD ?
  findBaseDir() {
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
