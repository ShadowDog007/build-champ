import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { SimpleGit } from 'simple-git';
import { ProjectVersion } from '../models/ProjectVersion';
import { TYPES } from '../TYPES';

export interface RepositoryService {
  /**
   * Gets the version of the provided path
   * @param path The path to check
   */
  getPathVersion(path: string): Promise<ProjectVersion>;

  /**
   * Gets the most recent version from the provided paths
   * @param paths The paths to check
   */
  getLatestPathVersion(...paths: string[]): Promise<ProjectVersion>;

  /**
   * Collects all the changes from the provided object
   * @param objectish
   */
  getChanges(objectish: string): Promise<string[]>;

  /**
   * Collects all changes between the the provided objects
   * @param objectishFrom
   * @param objectishTo
   */
  getChanges(objectishFrom: string, objectishTo: string): Promise<string[]>;
}

@injectable()
export class RepositoryServiceImpl implements RepositoryService {
  private readonly pathVersions: Record<string, ProjectVersion> = {};

  constructor(
    @inject(TYPES.Git) private readonly git: SimpleGit,
  ) { }

  async getPathVersion(path: string) {
    const version = this.pathVersions[path];

    if (version) {
      return version;
    }

    const log = await this.git.log({
      file: path.startsWith('/') ? path.slice(1) || '.' : path,
      maxCount: 1,
    });

    return this.pathVersions[path] = {
      hash: log.latest?.hash || 'uncommitted',
      hashShort: log.latest?.hash.substring(0, 8) || 'uncommitted',
      timestamp: new Date(log.latest?.date || new Date()),
    };
  }

  async getLatestPathVersion(...paths: string[]): Promise<ProjectVersion> {
    const versions = await Promise.all(paths.map((p) => this.getPathVersion(p)));

    return versions.sort((a, b) => b.timestamp.getDate() - a.timestamp.getDate())[0];
  }

  async getChanges(objectish: string): Promise<string[]>;
  async getChanges(objectishFrom: string, objectishTo: string): Promise<string[]>;
  async getChanges(objectishFrom: string, objectishTo?: string): Promise<string[]> {
    const args = objectishTo === undefined ? [objectishFrom] : [objectishFrom, objectishTo];
    const diff = await this.git.diffSummary(args);

    return diff.files.map(f => `/${f.file}`);
  }
}