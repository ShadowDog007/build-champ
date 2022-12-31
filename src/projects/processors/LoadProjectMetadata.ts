import { inject, injectable, multiInject } from 'inversify';
import { concat, uniq } from 'lodash';
import { basename, resolve } from 'path';
import { ProjectProcessor } from '.';
import { TYPES } from '../../TYPES';
import { BaseDirProvider } from '../../util/BaseDirProvider';
import { globAsync } from '../../util/globAsync';
import { ProjectMetadataLoader } from '../metadata';
import { Project } from '../Project';

/**
 * Loads additional data from meta-data loaders
 */
@injectable()
export class LoadProjectMetadata implements ProjectProcessor {

  constructor(
    @multiInject(TYPES.ProjectMetadataHandler) private readonly metadataLoaders: ProjectMetadataLoader[],
    @inject(TYPES.BaseDirProvider) private readonly baseDirProvider: BaseDirProvider,
  ) { }

  async * processProjects(projects: AsyncGenerator<Project>): AsyncGenerator<Project> {
    for await (let project of projects) {
      for (const loader of this.metadataLoaders) {
        const extensionFiles = await globAsync(loader.extensionPattern, { cwd: resolve(this.baseDirProvider.baseDir, project.dir), nocase: true });

        for (const metadataFile of extensionFiles) {
          const metadata = await loader.loadMetadata(resolve(this.baseDirProvider.baseDir, project.dir, metadataFile));
          project = {
            extends: project.extends,
            name: project.name || metadata.name || '',
            dir: project.dir,
            dependencies: uniq(concat(project.dependencies, metadata.dependencies || [])),
            commands: {
              ...metadata.commands,
              ...project.commands,
            },
            tags: metadata.tags
              ? [...metadata.tags, ...project.tags].sort()
              : project.tags,
          };
        }
      }

      if (!project.name) {
        project = {
          ...project,
          name: basename(project.dir),
        };
      }

      yield project;
    }
  }
}
