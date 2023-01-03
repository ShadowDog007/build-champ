import { inject, injectable, multiInject } from 'inversify';
import { dirname } from 'path';
import 'reflect-metadata';
import { Project, ProjectWithVersion } from '../models/Project';
import { ProjectVersion } from '../models/ProjectVersion';
import { ProjectProcessor } from '../processors';
import { TYPES } from '../TYPES';
import { FileService } from './FileService';
import { GlobService } from './GlobService';
import { RepositoryService } from './RepositoryService';

export interface ProjectService {
  getProjects(): Promise<Project[]>;
  getProjectsWithVersions(): Promise<ProjectWithVersion[]>;
  getProjectVersion(project: Project): Promise<ProjectVersion>;
}

@injectable()
export class ProjectServiceImpl implements ProjectService {
  private projects?: Promise<Project[]>;

  constructor(
    @inject(TYPES.BaseDir) private readonly baseDir: string,
    @inject(TYPES.FileService) private readonly fileService: FileService,
    @inject(TYPES.GlobService) private readonly globService: GlobService,
    @inject(TYPES.RepositoryService) private readonly repositoryService: RepositoryService,
    @multiInject(TYPES.ProjectProcessor) private readonly projectProcessors: ProjectProcessor[],
  ) { }

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
    for (const projectFile of await this.globService.glob(ProjectServiceImpl.projectFileGlob, { nocase: true })) {
      const parsedYaml = await this.fileService.readFileYaml<Partial<Omit<Project, 'dir'>>>(projectFile);
      yield {
        name: '', // If not provided, should be loaded by meta-data or default to directory name
        dir: dirname(projectFile),
        dependencies: [],
        commands: {},
        tags: [],
        ...parsedYaml,
      };
    }
  }
}
