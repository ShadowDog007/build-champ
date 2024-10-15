import { inject, injectable, multiInject } from 'inversify';
import { minimatch } from 'minimatch';
import 'reflect-metadata';
import { PluginConfiguration } from '../config/PluginConfiguration';
import { TargetDefaults } from '../config/TargetDefaults';
import { WorkspaceConfiguration } from '../config/WorkspaceConfiguration';
import { Project } from '../models/Project';
import { ProjectCommand } from '../models/ProjectCommand';
import { PluginTypes } from '../plugins/PluginTypes';
import { ProjectLoader } from '../plugins/ProjectLoader';
import { ProjectProcessor, ProjectProcessorPhase } from '../plugins/ProjectProcessor';
import { Provider, ProviderTypes } from '../providers';
import { PluginConfigurationProvider } from '../providers/PluginConfigurationProvider';
import { TYPES } from '../TYPES';
import { GlobService } from './GlobService';

export interface ProjectLoaderService {
  loadProjects(): Promise<Project[]>;
}

@injectable()
export class ProjectLoaderServiceImpl implements ProjectLoaderService {

  constructor(
    @inject(TYPES.GlobService) private readonly globService: GlobService,
    @inject(ProviderTypes.PluginConfigurationProvider) private readonly pluginConfiguration: PluginConfigurationProvider,
    @inject(TYPES.WorkspaceConfigurationProvider) private readonly workspaceConfiguration: Provider<WorkspaceConfiguration>,
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
    const workspaceConfig = await this.workspaceConfiguration.get();

    const include = workspaceConfig.sources.filter(s => s[0] !== '!');
    const ignore = workspaceConfig.sources
      .filter(s => s[0] === '!')
      .map(s => s.substring(1))
      .concat(loader.exclude ? loader.exclude : [], `!${loader.include}`);

    const loadedProjects: Promise<Project>[] = [];

    for await (const match of this.globService.glob(include, { ignore, dot: loader.include.includes('/.') })) {
      loadedProjects.push(this.loadProjectDir(match, loader));
    }
    return await Promise.all(loadedProjects);
  }

  async loadProjectDir(projectDir: string, loader: ProjectLoader): Promise<Project> {
    const pluginConfiguration = await this.pluginConfiguration.get(loader.pluginIdentifier);
    const project = await loader.loadProject(projectDir);
    const targetDefaults = this.getTargetDefaultsForProject(pluginConfiguration, project);
    const processedCommands = Object.entries(project.commands)
      .filter(([k]) => targetDefaults[k]?.enabled ?? true)
      .map(([k, v]) => [targetDefaults[k]?.targetName ?? k, v] satisfies [string, ProjectCommand | ProjectCommand[]]);

    return {
      ...project,
      commands: Object.fromEntries(processedCommands),
    };
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

  getTargetDefaultsForProject(pluginConfiguration: PluginConfiguration, project: Project): Record<string, TargetDefaults> {
    return Object.fromEntries([
      ...Object.entries(pluginConfiguration.targetDefaults ?? {}),
      ...Object.entries(pluginConfiguration.sourceTargetDefaults ?? {})
        .filter(([pattern]) => minimatch(project.dir, pattern))
        .map(([, targetDefaults]) => Object.entries(targetDefaults))
    ]);
  }

}