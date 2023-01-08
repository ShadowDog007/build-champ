import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { ServiceTypes } from '.';
import { Project, ProjectWithVersion } from '../models/Project';
import { ProjectVersion } from '../models/ProjectVersion';
import { TYPES } from '../TYPES';
import { PromiseCache } from '../util/PromiseCache';
import { ProjectLoaderService } from './ProjectLoaderService';
import { RepositoryService } from './RepositoryService';

export interface ProjectService {
  getProjects(): Promise<Project[]>;
  getProjectsWithVersions(): Promise<ProjectWithVersion[]>;
  getProjectVersion(project: Project): Promise<ProjectVersion>;
}

@injectable()
export class ProjectServiceImpl implements ProjectService {
  private projects = new PromiseCache(
    () => this.projectLoaderService.loadProjects()
  );

  constructor(
    @inject(TYPES.RepositoryService) private readonly repositoryService: RepositoryService,
    @inject(ServiceTypes.ProjectLoaderService) private readonly projectLoaderService: ProjectLoaderService,
  ) { }

  async getProjects() {
    const projects = await this.projects.get();
    return [...projects];
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
}
