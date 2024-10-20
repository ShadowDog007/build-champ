import { inject, injectable } from 'inversify';
import { isAbsolute, join, relative } from 'path';
import { Project } from '../../models/Project';
import { Provider } from '../../providers';
import { TYPES } from '../../TYPES';
import { SimpleProjectProcessor, ProjectProcessorPhase } from '../ProjectProcessor';

/**
 * Resolves relative paths and maps them releative to the base directory
 */
@injectable()
export class ResolveDependencies extends SimpleProjectProcessor {

  phase = ProjectProcessorPhase.first;

  constructor(
    @inject(TYPES.BaseDirProvider) private readonly baseDir: Provider<string>
  ) {
    super();
  }

  async process(project: Project): Promise<Project> {
    const baseDir = await this.baseDir.get();
    return {
      ...project,
      dir: this.resolveDirRelativeToBase(baseDir, project, '.').replaceAll('\\', '/'),
      dependencies: project.dependencies
        .map(d => this.resolveDirRelativeToBase(baseDir, project, d).replaceAll('\\', '/'))
    };
  }

  resolveDirRelativeToBase(baseDir: string, project: Project, relativeDir: string) {
    if (isAbsolute(relativeDir)) {
      return relativeDir;
    }
    const absoluteDir = join(project.dir, relativeDir);
    return `/${relative(baseDir, join(baseDir, absoluteDir))}`;
  }
}
