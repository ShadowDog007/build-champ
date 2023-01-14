import { inject, injectable } from 'inversify';
import { basename, dirname, extname } from 'path';
import 'reflect-metadata';
import { ProjectLoader } from '../ProjectLoader';
import { DotnetPlugin } from './DotnetPlugin';
import { DotnetProject } from './DotnetProject';
import { DotnetService } from './DotnetService';
import { DotnetTypes } from './DotnetTypes';

@injectable()
export class DotnetProjectLoader implements ProjectLoader<DotnetProject> {
  get pluginIdentifier() { return DotnetPlugin.pluginIdentifier; }

  readonly include = '**/*.csproj';

  constructor(
    @inject(DotnetTypes.DotnetService) private readonly dotnetService: DotnetService,
  ) { }

  async loadProject(match: string): Promise<DotnetProject> {
    const [
      projectSdk,
      projectProperties,
      packageReferences,
      projectReferences,
      directoryPropFiles,
    ] = await Promise.all([
      this.dotnetService.getProjectSdk(match),
      this.dotnetService.getProjectProperties(match),
      this.dotnetService.getPackageReferences(match),
      this.dotnetService.getProjectDependencies(match),
      this.dotnetService.getMatchingDirectoryPropFiles(match)
    ]);

    const isTestProject = packageReferences.includes('Microsoft.NET.Test.Sdk');
    const isPackable = projectProperties.IsPackable
      ? projectProperties.IsPackable.localeCompare('false', undefined, { sensitivity: 'base' }) !== 0
      : !isTestProject;

    const projectFileName = basename(match);

    return {
      name: basename(match, extname(match)),
      dir: dirname(match),
      dependencies: [
        ...projectReferences,
        ...directoryPropFiles
      ],
      // Only use dotnet CLI commands with SDK style projects
      commands: projectSdk ? {
        restore: {
          command: 'dotnet restore',
        },
        build: {
          command: 'dotnet build',
        },
        test: isTestProject ? {
          command: 'dotnet test',
        } : undefined,
        package: isPackable ? {
          command: 'dotnet pack'
        } : undefined,
        publish: {
          command: 'dotnet publish',
        }
      } : {
        restore: {
          command: `msbuild ${projectFileName} -t:restore`
        },
        build: {
          command: `msbuild ${projectFileName} -t:build`
        },
        publish: {
          command: `msbuild ${projectFileName} -t:publish`
        },
      },
      tags: [
        'plugin:dotnet',
        ...projectSdk ? [
          `dotnet-sdk:${projectSdk}`,
        ] : []
      ]
    };
  }
}