import { readFile } from 'fs/promises';
import { inject, injectable } from 'inversify';
import { Provider } from '../providers';
import { ContextService } from '../services/ContextService';
import { EvalService } from '../services/EvalService';
import { TYPES } from '../TYPES';
import { BaseProjectCommand } from './BaseProjectCommand';

export interface TemplateCommandOptions {
  /**
   * Path to the template file
   */
  readonly templateFile?: string;

  /**
   * Template text
   */
  readonly template?: string;

  /**
   * Custom context values to provide to template evaluation
   */
  readonly contextValues: `${string}=${string}`[];

  /**
   * Encoding to use parsing the template files
   */
  readonly encoding: BufferEncoding;
}

@injectable()
export class TemplateCommand extends BaseProjectCommand<[TemplateCommandOptions]> {
  constructor(
    @inject(TYPES.ContextService) private readonly contextService: ContextService,
    @inject(TYPES.EvalService) private readonly evalService: EvalService,
    @inject(TYPES.BaseDirProvider) private readonly baseDir: Provider<string>,
  ) {
    super();

    this.command
      .name('template')
      .description('Parses a file and prints it after processing template replacements')
      .option('-f, --template-file <filePath>', 'Path to the template file')
      .option('-t, --template <template>', 'Template text')
      .option('-c, --context <contextValues...>', 'Context values to include for template evaluations passed as `-c key=value`, use in templates as `${{context.key}}')
      .option('-e, --encoding <encoding>', 'Encoding to use when parsing the file', 'utf8');
  }

  async action(options: TemplateCommandOptions) {
    await this.checkBaseDir(this.baseDir);

    const template = await this.getTemplateContent(options);

    this.contextService.parseContextParameters(options.contextValues);
    const context = await this.contextService.getContext();

    this.command.configureOutput()
      .writeOut?.(this.evalService.safeEvalTemplate(template, context));
  }

  async getTemplateContent(options: TemplateCommandOptions) {
    if (options.templateFile && options.template) {
      this.error('Must only provide one of --template-file or --template', { exitCode: 31 });
    }

    if (options.templateFile) {
      return await readFile(options.templateFile, { encoding: options.encoding });
    }

    if (options.template) {
      return options.template;
    }

    this.error('Must provide either --template-file or --template', { exitCode: 32 });
  }
}
