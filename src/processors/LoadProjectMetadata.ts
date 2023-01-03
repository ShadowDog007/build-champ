import { inject, injectable, multiInject } from 'inversify';
import { concat, uniq } from 'lodash';
import { basename, join } from 'path';
import 'reflect-metadata';
import { ProjectProcessor } from '.';
import { TYPES } from '../TYPES';
import { ProjectMetadataLoader } from '../metadata';
import { Project } from '../models/Project';
import { GlobService } from '../services/GlobService';

/**
 * Loads additional data from meta-data loaders
 */
@injectable()
export class LoadProjectMetadata implements ProjectProcessor {

  constructor(
    @multiInject(TYPES.ProjectMetadataHandler) private readonly metadataLoaders: ProjectMetadataLoader[],
    @inject(TYPES.GlobService) private readonly globService: GlobService,
    @inject(TYPES.BaseDir) private readonly baseDir: string,
  ) { }

  async * processProjects(projects: AsyncGenerator<Project>): AsyncGenerator<Project> {
    for await (let project of projects) {
      for (const loader of this.metadataLoaders) {
        const extensionFiles = await this.globService.glob(loader.extensionPattern, { cwd: project.dir, nocase: true });

        for (const metadataFile of extensionFiles) {
          const metadata = await loader.loadMetadata(join(project.dir, metadataFile));
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
