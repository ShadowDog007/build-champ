import { inject, injectable } from 'inversify';
import { EOL } from 'os';
import { Provider } from '../providers';
import { ContextService } from '../services/ContextService';
import { EvalService } from '../services/EvalService';
import { ProjectService } from '../services/ProjectService';
import { RepositoryService } from '../services/RepositoryService';
import { TYPES } from '../TYPES';
import { BaseProjectFilterCommand, ProjectFilterOptions } from './BaseProjectFilterCommand';
import { ProjectGraph } from '../models/ProjectGraph';

export interface GraphCommandOptions extends ProjectFilterOptions {
  readonly direct: boolean;
  readonly longVersion: boolean;
  readonly template: string;
  readonly join: string;
}

export const defaultTemplate = '=> ${{name}} (${{longVersion ? version.hash : version.hashShort}} @ ${{version.ago}})';

@injectable()
export class GraphCommand extends BaseProjectFilterCommand<[ProjectFilterOptions]> {
  constructor(
    @inject(TYPES.BaseDirProvider) public baseDir: Provider<string>,
    @inject(TYPES.ProjectService) projectService: ProjectService,
    @inject(TYPES.RepositoryService) repositoryService: RepositoryService,
    @inject(TYPES.ContextService) private readonly contextService: ContextService,
    @inject(TYPES.EvalService) private readonly evalService: EvalService,
  ) {
    super(projectService, repositoryService);

    this.command
      .name('graph')
      .description('Displays a graph of project dependencies')
      .option('-d --direct', 'Only show direct dependencies')
      .option('--long-version', 'Show full version string')
      .option('--template <template>', 'Template string to customise how each project is printed using project variables', defaultTemplate)
      .option('-j --join <join>', 'String to join project templates by', EOL);
  }

  async action(options: GraphCommandOptions) {
    await this.checkBaseDir(this.baseDir);

    this.verbose(`Listing projects within \`${await this.baseDir.get()}\``);

    const projects = await this.listProjects(options);

    if (projects.length === 0) {
      this.error('No matching projects');
    }

    const topLevelProjects = projects
      .sort((a, b) => a.graph.dependencies.length - b.graph.dependencies.length)
      .map(p => p.graph)
      .filter(p => p.dependencies.length === projects[0].graph.dependencies.length);

    this.log(`${await this.baseDir.get()}:`);
    this.logGraph(options, 0, ...topLevelProjects);
  }

  logGraph(options: GraphCommandOptions, level: number, ...graphNodes: ProjectGraph[]) {
    const prefix = `${' '.repeat(level)}=> `;
    for (const graph of graphNodes) {
      this.log(prefix + graph.dir);
      if (level !== 1 && options.direct) {
        this.logGraph(options, level + 1, ...graph.dependants);
      }
    }
    if (level === 0)
      this.log(' ');
  }
}
