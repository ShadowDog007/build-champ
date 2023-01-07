import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { simpleGit, SimpleGit } from 'simple-git';
import { ValueProvider } from '.';
import { TYPES } from '../TYPES';

@injectable()
export class GitProvider extends ValueProvider<SimpleGit> {
  constructor(@inject(TYPES.BaseDirProvider) baseDir: PromiseLike<string>) {
    super(async () => simpleGit(await baseDir));
  }
}
