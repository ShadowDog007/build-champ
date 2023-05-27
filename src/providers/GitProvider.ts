import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { simpleGit, SimpleGit } from 'simple-git';
import { Provider } from '.';
import { TYPES } from '../TYPES';

@injectable()
export class GitProvider extends Provider<SimpleGit> {
  constructor(@inject(TYPES.BaseDirProvider) private readonly baseDir: Provider<string>) {
    super();
  }
  async provider() {
    return simpleGit(await this.baseDir.get());
  }
}
