import { Command, ErrorOptions } from 'commander';
import { injectable } from 'inversify';
import 'reflect-metadata';
import { Provider } from '../providers';
import { BuildChampError } from '../util/BuildChampError';

@injectable()
export abstract class BaseProjectCommand<TArgs extends unknown[]> {
  readonly command: Command;
  private verboseEnabled = false;

  constructor() {
    this.command = new Command()
      .action(async (...args) => {
        try {
          await this.action(...(args as TArgs));
        } catch (error) {
          if (error instanceof BuildChampError) {
            this.error(error.message);
          } else {
            throw error;
          }
        }
      })
      .option('-v, --verbose', 'Enable verbose output')
      .on('option:verbose', () => this.verboseEnabled = true);
  }

  abstract action(...args: TArgs): Promise<void>;

  async checkBaseDir(baseDir: Provider<string>) {
    try {
      await baseDir.get();
    } catch {
      this.error(`Couldn't find git repository containing ${process.cwd()}`, { exitCode: 2 });
    }
  }

  verbose(message: string): void {
    if (this.verboseEnabled) {
      this.log(message);
    }
  }

  log(message: string): void {
    this.command.configureOutput().writeOut?.(message);
    this.command.configureOutput().writeOut?.('\n');
  }

  /**
   * Display error message
   */
  error(message: string): void;
  /**
   * Display error message and exit
   */
  error(message: string, errorOptions: ErrorOptions): never;
  /**
   * Display error message and optionally exit
   */
  error(message: string, errorOptions?: ErrorOptions): never | void {
    if (errorOptions) {
      this.command.error(message, errorOptions);
    } else {
      this.command.configureOutput().writeErr?.(message);
      this.command.configureOutput().writeErr?.('\n');
    }
  }
}
