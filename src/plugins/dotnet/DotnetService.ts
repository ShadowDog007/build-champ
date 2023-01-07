import { inject, injectable } from 'inversify';
import { join } from 'lodash';
import { dirname } from 'path';
import 'reflect-metadata';
import { ElementCompact, xml2js } from 'xml-js';
import { FileService } from '../../services/FileService';
import { GlobService } from '../../services/GlobService';
import { TYPES } from '../../TYPES';
import { PromiseCache, PromisesCache } from '../../util/PromiseCache';

export interface DotnetSdkProjectFile extends ElementCompact {
  Project: ElementCompact & {
    PropertyGroup?: ElementCompact | ElementCompact[];
    ItemGroup?: ItemGroup | ItemGroup[];
  };
}

export interface ItemGroup extends ElementCompact {
  ProjectReference: DotnetSdkReference | DotnetSdkReference[];
  PackageReference: DotnetSdkReference | DotnetSdkReference[];
}

export interface DotnetSdkReference {
  _attributes: {
    Include: string;
  };
}

@injectable()
export class DotnetService {

  private readonly directoryPropFiles = new PromiseCache(
    () => this.globService.glob('**/Directory.*.props', { nocase: true })
  );

  private readonly projectFileCache = new PromisesCache(
    (match: string) => this.loadProjectFile(match)
  );

  private readonly projectReferenceCache = new PromisesCache(
    (match: string) => this.loadProjectReferences(match)
  );

  constructor(
    @inject(TYPES.GlobService) private readonly globService: GlobService,
    @inject(TYPES.FileService) private readonly fileService: FileService,
  ) { }

  async getProjectFile(csproj: string) {
    return this.projectFileCache.get(csproj);
  }

  async getDirectoryPropFiles() {
    return this.directoryPropFiles.get();
  }

  async getMatchingDirectoryPropFiles(dirOrCsproj: string) {
    const directoryPropFiles = await this.getDirectoryPropFiles();

    return directoryPropFiles.filter(f => dirOrCsproj.startsWith(dirname(f)));
  }

  async getProjectProperties(csproj: string): Promise<Record<string, string>> {
    const files = [
      ...await this.getMatchingDirectoryPropFiles(csproj),
      csproj,
    ];

    const projectFiles = await Promise.all(files.map(f => this.projectFileCache.get(f)));

    return Object.fromEntries(
      projectFiles
        .flatMap(f => f.Project.PropertyGroup)
        .filter((g): g is ElementCompact => !!g)
        .flatMap(g => Object.entries(g))
        .map(([k, v]) => [k, v?._text])
        .filter((e): e is [string, string] => !e[0].startsWith('_') && typeof e[1] === 'string')
    );
  }

  async getPackageReferences(csproj: string) {
    const projectFile = await this.getProjectFile(csproj);

    if (!projectFile.Project.PropertyGroup)
      return {};


    return Object.fromEntries(
      [projectFile.Project.PropertyGroup]
        .flat()
        .map(g => Object.entries(g))
        .flat()
        .filter(([k]) => !k.startsWith('_'))
    );
  }

  async getProjectDependencies(csproj: string) {
    return this.projectReferenceCache.get(csproj);
  }

  private async loadProjectFile(csproj: string): Promise<DotnetSdkProjectFile> {
    const projectFile = await this.fileService.readFileUtf8(csproj);
    return xml2js(projectFile, { compact: true }) as DotnetSdkProjectFile;
  }

  private async loadProjectReferences(match: string): Promise<string[]> {
    const projectFile = await this.projectFileCache.get(match);

    const relativeCsprojPaths = [
      projectFile.Project.ItemGroup,

    ]
      .flat()
      // Only take item groups which have project references
      .filter((g): g is ItemGroup => !!g && !!g.ProjectReference)
      .flatMap(itemGroup => itemGroup.ProjectReference)
      // Map project references to project dir relative to base dir
      .map(ref => ref._attributes.Include)
      || [];

    const transitiveDependencies = await Promise.all(
      relativeCsprojPaths.map(dep => this.projectReferenceCache.get(join(dirname(match), dep)))
    );

    return [
      ...relativeCsprojPaths.map(dirname),
      ...transitiveDependencies.flat(),
    ];
  }
}
