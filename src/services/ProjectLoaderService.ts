import { inject, injectable, multiInject } from 'inversify';
import 'reflect-metadata';
import { WorkspaceConfiguration } from '../config/WorkspaceConfiguration';
import { Project } from '../models/Project';
import { PluginTypes } from '../plugins/PluginTypes';
import { ProjectLoader } from '../plugins/ProjectLoader';
import { ProjectProcessor, ProjectProcessorPhase } from '../plugins/ProjectProcessor';
import { TYPES } from '../TYPES';
import { GlobService } from './GlobService';

export interface ProjectLoaderService {
  loadProjects(): Promise<Project[]>;
}

@injectable()
export class ProjectLoaderServiceImpl implements ProjectLoaderService {

  constructor(
    @inject(TYPES.GlobService) private readonly globService: GlobService,
    @inject(TYPES.WorkspaceConfigurationProvider) private readonly workspaceConfiguration: PromiseLike<WorkspaceConfiguration>,
    @multiInject(PluginTypes.ProjectLoader) private readonly projectLoaders: ProjectLoader[],
    @multiInject(PluginTypes.ProjectProcessor) private readonly projectProcessors: ProjectProcessor[],
  ) { }

  async loadProjects(): Promise<Project[]> {
    const projects = (await Promise.all(
      this.projectLoaders.map(loader => this.getLoaderProjects(loader))
    )).flat();

    const processedProjects = await this.getSortedProjectProcessors().reduce(
      async (previous, processor) => {
        return processor.processBatch(await previous);
      }, Promise.resolve(projects)
    );

    return processedProjects
      .sort((a, b) => a.dir.localeCompare(b.dir));
  }

  async getLoaderProjects(loader: ProjectLoader): Promise<Project[]> {
    const workspaceConfig = await this.workspaceConfiguration;

    const include = workspaceConfig.sources.filter(s => s[0] !== '!');
    const ignore = workspaceConfig.sources
      .filter(s => s[0] === '!')
      .map(s => s.substring(1))
      .concat(loader.exclude ? loader.exclude : [], `!${loader.include}`);

    const matches = (await Promise.all(
      include.map(pattern => this.globService.glob(pattern, { ignore }))
    )).flat();

    return await Promise.all(matches.map(match => loader.loadProject(match)));
  }

  getSortedProjectProcessors() {
    return this.projectProcessors
      .sort((a, b) => {
        if (a.after?.find(t => b instanceof t)) {
          return -1;
        }
        if (a.before?.find(t => b instanceof t)) {
          return 1;
        }
        return (a.phase ?? ProjectProcessorPhase.middle) - (b.phase ?? ProjectProcessorPhase.middle);
      });
  }

}