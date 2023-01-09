import { inject, injectable } from 'inversify';
import { basename, dirname, extname } from 'path';
import 'reflect-metadata';
import { ProjectLoader } from '../ProjectLoader';
import { DotnetProject } from './DotnetProject';
import { DotnetService } from './DotnetService';
import { DotnetTypes } from './DotnetTypes';

@injectable()
export class DotnetProjectLoader implements ProjectLoader<DotnetProject> {
  readonly include = '**/*.csproj';

  constructor(
    @inject(DotnetTypes.DotnetService) private readonly dotnetService: DotnetService,
  ) { }

  async loadProject(match: string): Promise<DotnetProject> {
    const [
      projectProperties,
      packageReferences,
      projectReferences,
      directoryPropFiles,
    ] = await Promise.all([
      this.dotnetService.getProjectProperties(match),
      this.dotnetService.getPackageReferences(match),
      this.dotnetService.getProjectDependencies(match),
      this.dotnetService.getMatchingDirectoryPropFiles(match)
    ]);

    return {
      name: basename(match, extname(match)),
      dir: dirname(match),
      dependencies: [
        ...projectReferences,
        ...directoryPropFiles
      ],
      commands: {
        restore: {
          command: 'dotnet',
          arguments: ['restore'],
        },
        build: {
          command: 'dotnet',
          arguments: ['build']
        },
        test: packageReferences.includes('Microsoft.NET.Test.Sdk') ? {
          command: 'dotnet',
          arguments: ['test'],
        } : undefined,
        package: projectProperties['IsPackable']?.localeCompare('false', undefined, { sensitivity: 'base' }) !== 0 ? {
          command: 'dotnet',
          arguments: ['package'],
        } : undefined,
        publish: {
          command: 'dotnet',
          arguments: ['publish'],
        }
      },
      tags: [
        'plugin:dotnet',
      ]
    };
  }
}