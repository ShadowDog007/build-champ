import { ChildProcessWithoutNullStreams, spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { injectable } from 'inversify';
import 'reflect-metadata';

export interface SpawnService {
  spawn(command: string, args: ReadonlyArray<string>, options: SpawnOptionsWithoutStdio): ChildProcessWithoutNullStreams;

  /**
   * Waits for the process to complete, fails if the process completes with a non-zero exit code.
   * @param process the process to wait for
   * @param processName optional name of the process to use in any errors
   */
  waitForCompletion(process: ChildProcessWithoutNullStreams, processName?: string): Promise<void>;
}

@injectable()
export class SpawnServiceImpl implements SpawnService {
  spawn(command: string, args: readonly string[], options: SpawnOptionsWithoutStdio): ChildProcessWithoutNullStreams {
    return spawn(command, args, options);
  }

  waitForCompletion(process: ChildProcessWithoutNullStreams, processName?: string) {
    return new Promise<void>((resolve, reject) => {
      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`${processName ?? process.spawnfile} exited with code ${code}`));
        }
      });
    });
  }
}
