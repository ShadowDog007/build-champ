import { inject, injectable } from 'inversify';
import { mapValues } from 'lodash';
import { dirname, join } from 'path';
import 'reflect-metadata';
import { Project } from '../../models/Project';
import { ServiceTypes } from '../../services';
import { FileService } from '../../services/FileService';
import { PromisesCache } from '../../util/PromiseCache';
import { ProjectLoader } from '../ProjectLoader';

@injectable()
export class DefaultProjectLoader implements ProjectLoader {
  include = '**/.{module,project}.{json,yaml,yml}';

  private readonly projectFileCache = new PromisesCache(
    (file: string) => this.fileService.readFileYaml<Partial<Omit<Project, 'dir'>>>(file)
  );

  constructor(
    @inject(ServiceTypes.FileService) private readonly fileService: FileService,
  ) { }

  async loadProject(match: string): Promise<Project> {
    const yaml = await this.projectFileCache.get(match);

    const projectDir = dirname(match);

    const extension = yaml.extends
      ? await this.loadProjectExtension(projectDir, yaml.extends)
      : undefined;

    return {
      extends: yaml.extends,
      dir: projectDir,
      name: yaml.name || extension?.name || '',
      dependencies: [
        ...extension?.dependencies || [],
        ...yaml.dependencies || [],
      ],
      tags: [
        'plugin:default',
        ...extension?.dependencies || [],
        ...yaml.tags || [],
      ],
      commands: {
        ...extension?.commands,
        ...yaml.commands,
      },
    };
  }

  async loadProjectExtension(projectDir: string, relativeExtensionFile: string): Promise<Project> {
    const extension = await this.loadProject(join(projectDir, relativeExtensionFile));

    return {
      ...extension,
      dependencies: extension.dependencies.map(d => join(projectDir, extension.dir, d)),
      commands: {
        ...mapValues(extension?.commands, commandPipeline => [commandPipeline]
          .flat()
          .map(command => ({
            ...command,
            workingDirectory: command.workingDirectory
              ? join(projectDir, extension.dir, command.workingDirectory)
              : extension.dir
          }))
        )
      }
    };
  }

}