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
  readonly exclude = '**/{bin,obj,packages}/**';

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
          command: 'dotnet restore ${{env.DOTNET_RESTORE_ARGS || ""}}',
        },
        build: {
          command: 'dotnet build -c ${{env.DOTNET_CONFIGURATION || "Release"}} ${{env.DOTNET_BUILD_ARGS || ""}}',
        },
        test: isTestProject ? {
          command: 'dotnet test -c ${{env.DOTNET_CONFIGURATION || "Release"}} ${{env.DOTNET_BUILD_ARGS || ""}} ${{env.DOTNET_TEST_ARGS || ""}}',
        } : undefined,
        package: isPackable ? {
          command: 'dotnet pack -c ${{env.DOTNET_CONFIGURATION || "Release"}} ${{env.DOTNET_BUILD_ARGS || ""}} ${{env.DOTNET_PACK_ARGS || ""}}'
        } : undefined,
        publish: {
          command: 'dotnet publish -c ${{env.DOTNET_CONFIGURATION || "Release"}} ${{env.DOTNET_BUILD_ARGS || ""}} ${{env.DOTNET_PUBLISH_ARGS || ""}}',
        }
      } : {
        restore: {
          command: `msbuild ${projectFileName} -t:restore  $\{{env.DOTNET_RESTORE_ARGS || ""}}`
        },
        build: {
          command: `msbuild ${projectFileName} -t:build -c $\{{env.DOTNET_CONFIGURATION || "Release"}} $\{{env.DOTNET_BUILD_ARGS || ""}}`
        },
        publish: {
          command: `msbuild ${projectFileName} -t:publish -c $\{{env.DOTNET_CONFIGURATION || "Release"}} $\{{env.DOTNET_PUBLISH_ARGS || ""}}`
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