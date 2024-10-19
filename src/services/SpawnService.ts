import { ChildProcessWithoutNullStreams, spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { injectable } from 'inversify';
import { createInterface } from 'readline/promises';
import 'reflect-metadata';
import { Readable } from 'stream';

export interface SpawnService {
  spawn(command: string, args: ReadonlyArray<string>, options: SpawnOptionsWithoutStdio): ChildProcessWithoutNullStreams;

  /**
   * Read lines from the provided readable IO
   * @param processIo 
   */
  readLines(processIo: Readable): AsyncGenerator<string>;

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

  async *readLines(processIo: Readable): AsyncGenerator<string> {
    processIo.setEncoding('utf8');
    const rl = createInterface(processIo);
    for await (const line of rl)
      yield line;
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
