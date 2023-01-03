import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { simpleGit, SimpleGit } from 'simple-git';
import { ValueProvider } from '.';
import { TYPES } from '../TYPES';

@injectable()
export class GitProvider implements ValueProvider<SimpleGit> {
  readonly value: SimpleGit;

  constructor(@inject(TYPES.BaseDir) baseDir: string) {
    this.value = simpleGit(baseDir);
  }
}
