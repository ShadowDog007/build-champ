import { inject, injectable } from 'inversify';
import { isAbsolute, join, relative } from 'path';
import { ProjectProcessor } from '.';
import { Project } from '../models/Project';
import { TYPES } from '../TYPES';

/**
 * Resolves relative paths and maps them releative to the base directory
 */
@injectable()
export class ResolveDependencies implements ProjectProcessor {

  constructor(
    @inject(TYPES.BaseDir) private readonly baseDir: string
  ) { }

  async * processProjects(projects: AsyncGenerator<Project>): AsyncGenerator<Project> {
    for await (const project of projects) {
      yield {
        ...project,
        dependencies: project.dependencies
          .map(d => this.resolveDirRelativeToBase(project, d).replaceAll('\\', '/')),
      };
    }
  }

  resolveDirRelativeToBase(project: Project, relativeDir: string) {
    if (isAbsolute(relativeDir)) {
      return relativeDir;
    }
    const absoluteDir = join(project.dir, relativeDir);
    return `/${relative(this.baseDir, absoluteDir)}`;
  }

}