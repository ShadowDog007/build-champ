import { statSync } from 'fs';
import { injectable } from 'inversify';
import { dirname, join } from 'path';
import 'reflect-metadata';
import { ValueProvider } from '.';

@injectable()
export class BaseDirProvider implements ValueProvider<string> {
  private _baseDir: string | null = null;

  get value(): string {
    if (this._baseDir === null) {
      this._baseDir = this.findBaseDir();
    }
    return this._baseDir;
  }

  findBaseDir() {
    let dir = process.cwd();

    while (!this.exists(join(dir, '.git'))) {
      const parentDir = dirname(dir);
      if (dir === parentDir) {
        // Can't find base dir
        return '';
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
