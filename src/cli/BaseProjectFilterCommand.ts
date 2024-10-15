import { inject, injectable } from 'inversify';
import { minimatch } from 'minimatch';
import { ProjectWithVersion } from '../models/Project';
import { ProjectService } from '../services/ProjectService';
import { RepositoryService } from '../services/RepositoryService';
import { TYPES } from '../TYPES';
import { BaseProjectCommand } from './BaseProjectCommand';

export interface ProjectFilterOptions {
  /**
   * Glob patterns to match against projects
   */
  readonly projects?: string[];
  readonly tags?: string[];
  readonly changedIn?: string;
  readonly changedFrom?: string;
  readonly changedTo?: string;
}

@injectable()
export abstract class BaseProjectFilterCommand<TArgs extends [...unknown[], ProjectFilterOptions]> extends BaseProjectCommand<TArgs> {
  constructor(
    @inject(TYPES.ProjectService) protected readonly projectService: ProjectService,
    @inject(TYPES.RepositoryService) protected readonly repositoryService: RepositoryService) {
    super();
    this.command
      .option('-p, --projects <globPatterns...>', 'Filter only projects with matching names (supports glob patterns)')
      .option('-t, --tags <tags...>', 'Filter only projects with provided tags')
      .option('--changed-in <objectIsh>', 'Filter only projects which were changed in a specific version')
      .option('--changed-from <objectIsh>', 'Filter only projects which were changed after specific version')
      .option('--changed-to <objectIsh>', 'Filter only projects which were changed before specific version (Use with --changed-from)');
  }

  async listProjects(options: ProjectFilterOptions) {
    let projects = await this.projectService.getProjectsWithVersions();

    const initialProjectCount = projects.length;

    projects = this.filterProjectPatterns(projects, options.projects);
    projects = this.filterTags(projects, options.tags);
    projects = await this.filterChangedFromTo(projects, options.changedIn, options.changedIn);
    projects = await this.filterChangedFromTo(projects, options.changedFrom, options.changedTo);

    this.verbose(`Matched ${projects.length} of ${initialProjectCount} projects`);

    return projects;
  }

  filterProjectPatterns(projects: ProjectWithVersion[], projectPatterns: ProjectFilterOptions['projects']) {
    return projectPatterns
      ? projects.filter(project => projectPatterns.some(pattern => minimatch(project.name, pattern)))
      : projects;
  }

  filterTags(projects: ProjectWithVersion[], tags: ProjectFilterOptions['tags']) {
    return tags
      ? projects.filter(p => tags.every(t => p.tags.includes(t)))
      : projects;
  }

  async filterChangedFromTo(projects: ProjectWithVersion[], changedFrom: ProjectFilterOptions['changedFrom'], changedTo: ProjectFilterOptions['changedTo']) {
    if (changedFrom) {
      const directoryChanges = changedTo
        ? await this.repositoryService.getChanges(changedFrom, changedTo)
        : await this.repositoryService.getChanges(changedFrom);

      return projects.filter(p => [p.dir, ...p.dependencies]
        // Filter any projects which have any directory changes
        .some(d => directoryChanges.some(c => c.startsWith(d))));
    }
    return projects;
  }
}
