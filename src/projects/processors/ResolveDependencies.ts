import { inject, injectable } from 'inversify';
import { relative, resolve } from 'path';
import { ProjectProcessor } from '.';
import { TYPES } from '../../TYPES';
import { Project } from '../Project';

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
    const absoluteDir = resolve(this.baseDir, project.dir, relativeDir);
    return relative(this.baseDir, absoluteDir);
  }

}