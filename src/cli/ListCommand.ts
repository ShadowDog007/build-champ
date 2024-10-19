import { inject, injectable } from 'inversify';
import { EOL } from 'os';
import { Provider } from '../providers';
import { ContextService } from '../services/ContextService';
import { EvalService } from '../services/EvalService';
import { ProjectService } from '../services/ProjectService';
import { RepositoryService } from '../services/RepositoryService';
import { TYPES } from '../TYPES';
import { BaseProjectFilterCommand, ProjectFilterOptions } from './BaseProjectFilterCommand';

export interface ListCommandOptions extends ProjectFilterOptions {
  readonly longVersion: boolean;
  readonly template: string;
  readonly join: string;
}

export const defaultTemplate = '=> ${{name}} (${{longVersion ? version.hash : version.hashShort}} @ ${{version.ago}})';

@injectable()
export class ListCommand extends BaseProjectFilterCommand<[ProjectFilterOptions]> {
  constructor(
    @inject(TYPES.BaseDirProvider) public baseDir: Provider<string>,
    @inject(TYPES.ProjectService) projectService: ProjectService,
    @inject(TYPES.RepositoryService) repositoryService: RepositoryService,
    @inject(TYPES.ContextService) private readonly contextService: ContextService,
    @inject(TYPES.EvalService) private readonly evalService: EvalService,
  ) {
    super(projectService, repositoryService);

    this.command
      .name('list')
      .description('Lists all projects within the current git repository')
      .option('--long-version', 'Show full version string')
      .option('--template <template>', 'Template string to customise how each project is printed using project variables', defaultTemplate)
      .option('-j --join <join>', 'String to join project templates by', EOL);
  }

  async action(options: ListCommandOptions) {
    await this.checkBaseDir(this.baseDir);

    this.verbose(`Listing projects within \`${await this.baseDir.get()}\``);

    const projects = await this.listProjects(options);

    if (projects.length === 0) {
      this.error('No matching projects');
    }

    const templated = await Promise.all(projects.map(async project => {
      const context = await this.contextService.getProjectContext(project);
      return this.evalService.safeEvalTemplateAsync(options.template, {
        ...context,
        longVersion: options.longVersion,
      });
    }));

    this.log(templated.join(options.join));
  }
}
