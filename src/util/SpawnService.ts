import { ChildProcessWithoutNullStreams, spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { injectable } from 'inversify';
import 'reflect-metadata';

export interface SpawnService {
  spawn(command: string, args: ReadonlyArray<string>, options: SpawnOptionsWithoutStdio): ChildProcessWithoutNullStreams;
}

@injectable()
export class SpawnServiceImpl implements SpawnService {
  spawn(command: string, args: readonly string[], options: SpawnOptionsWithoutStdio): ChildProcessWithoutNullStreams {
    return spawn(command, args, options);
  }
}
