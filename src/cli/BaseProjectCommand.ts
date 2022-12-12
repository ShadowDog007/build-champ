import { Command, ErrorOptions } from 'commander';
import { injectable } from 'inversify';
import 'reflect-metadata';
import { EvalContextDynamic, EvalService } from '../util/EvalService';

@injectable()
export abstract class BaseProjectCommand<TArgs extends unknown[]> {
  readonly command: Command;
  private verboseEnabled = false;

  constructor() {
    this.command = new Command()
      .action((...args) => this.action(...(args as TArgs)))
      .option('-v, --verbose', 'Enable verbose output')
      .on('option:verbose', () => this.verboseEnabled = true);
  }

  abstract action(...args: TArgs): Promise<void>;

  checkBaseDir(baseDir: string) {
    if (!baseDir) {
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

  async prepareEvalContext(evalService: EvalService, contextValues?: `${string}=${string}`[], dynamicContext?: Partial<Omit<EvalContextDynamic, 'context'>>) {
    await evalService.prepareContext();

    if (contextValues && contextValues.length > 0) {
      evalService.amendContext({
        ...dynamicContext,
        context: Object.fromEntries(contextValues.map(v => v.split('=') as [string, string])),
      });
    }
  }
}
