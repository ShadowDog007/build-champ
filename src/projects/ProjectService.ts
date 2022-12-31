import { readFile } from 'fs/promises';
import { inject, injectable, multiInject } from 'inversify';
import { dirname, resolve } from 'path';
import 'reflect-metadata';
import { parse } from 'yaml';
import { TYPES } from '../TYPES';
import { BaseDirProvider } from '../util/BaseDirProvider';
import { globAsync } from '../util/globAsync';
import { RepositoryService } from '../util/RepositoryService';
import { ProjectProcessor } from './processors';
import { Project, ProjectWithVersion } from './Project';
import { ProjectVersion } from './ProjectVersion';

export interface ProjectService {
  getProjects(): Promise<Project[]>;
  getProjectsWithVersions(): Promise<ProjectWithVersion[]>;
  getProjectVersion(project: Project): Promise<ProjectVersion>;
}

@injectable()
export class ProjectServiceImpl implements ProjectService {
  private readonly baseDir: string;
  private projects?: Promise<Project[]>;

  constructor(
    @inject(TYPES.BaseDirProvider) baseDirProvider: BaseDirProvider,
    @inject(TYPES.RepositoryService) private readonly repositoryService: RepositoryService,
    @multiInject(TYPES.ProjectProcessor) private readonly projectProcessors: ProjectProcessor[],
  ) {
    this.baseDir = baseDirProvider.baseDir;
  }

  async getProjects() {
    if (!this.projects) {
      this.projects = this.loadProjects();
    }

    return [...await this.projects];
  }

  async getProjectsWithVersions() {
    const projects = await this.getProjects();

    return Promise.all(projects.map(async p => {
      return {
        ...p,
        version: await this.getProjectVersion(p),
      };
    }));
  }

  getProjectVersion(project: Project) {
    return this.repositoryService.getLatestPathVersion(project.dir, ...project.dependencies);
  }

  async loadProjects(): Promise<Project[]> {
    const projects: Project[] = [];

    const projectsIterator = this.projectProcessors.reduce(
      (iterator, processor) => processor.processProjects(iterator),
      this.loadProjectsBase()
    );

    for await (const project of projectsIterator) {
      projects.push(project);
    }

    return projects.sort((a, b) => a.dir.localeCompare(b.dir));
  }

  static readonly projectFileGlob = '**/.{project,module}.{yaml,yml}';

  async * loadProjectsBase(): AsyncGenerator<Project> {
    for (const projectFile of await globAsync(ProjectServiceImpl.projectFileGlob, { cwd: this.baseDir, nocase: true })) {
      const yamlContent = await readFile(resolve(this.baseDir, projectFile), { encoding: 'utf8' });
      try {
        const parsedYaml = parse(yamlContent) as Partial<Omit<Project, 'dir'>>;

        yield {
          name: '', // If not provided, should be loaded by meta-data or default to directory name
          dir: dirname(projectFile),
          dependencies: [],
          commands: {},
          tags: [],
          ...parsedYaml,
        };
      } catch (error) {
        console.error(`Error parsing project file '#%s' #%s`, projectFile, error);
        throw error;
      }
    }
  }
}
