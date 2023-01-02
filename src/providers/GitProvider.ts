import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { simpleGit, SimpleGit } from 'simple-git';
import { TYPES } from '../TYPES';

@injectable()
export class GitProvider {
  readonly git: SimpleGit;

  constructor(@inject(TYPES.BaseDir) baseDir: string) {
    this.git = simpleGit(baseDir);
  }
}
