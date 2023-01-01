import { inject, injectable } from 'inversify';
import { EOL } from 'os';
import { ContextService } from '../util/ContextService';
import { ProjectService } from '../projects/ProjectService';
import { TYPES } from '../TYPES';
import { EvalService } from '../util/EvalService';
import { RepositoryService } from '../util/RepositoryService';
import { BaseProjectFilterCommand, ProjectFilterOptions } from './BaseProjectFilterCommand';

export interface ListCommandOptions extends ProjectFilterOptions {
  readonly longVersion: boolean;
  readonly template: string;
  readonly join: string;
}

export const defaultTemplate = '=> ${{name}} (${{longVersion ? version.hash : version.hashShort}} @ ${{version.timestamp.toISOString()}})';

@injectable()
export class ListCommand extends BaseProjectFilterCommand<[ProjectFilterOptions]> {
  constructor(
    @inject(TYPES.BaseDir) public baseDir: string,
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
    this.checkBaseDir(this.baseDir);

    this.verbose(`Listing projects within \`${this.baseDir}\``);

    const projects = await this.listProjects(options);

    if (projects.length === 0) {
      this.error('No matching projects');
    }

    const templated: string[] = [];

    for (const project of projects) {
      const context = await this.contextService.getProjectContext(project);
      templated.push(
        this.evalService.safeEvalTemplate(options.template, {
          ...context,
          longVersion: options.longVersion,
        })
      );
    }

    this.log(templated.join(options.join));
  }
}
