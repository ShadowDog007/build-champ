import { inject, injectable } from 'inversify';
import { basename, dirname, join, relative } from 'path';
import 'reflect-metadata';
import { ElementCompact, xml2js } from 'xml-js';
import { ProjectMetadataLoader } from '.';
import { ProjectMetadata } from '../models/ProjectMetadata';
import { FileService } from '../services/FileService';
import { GlobService } from '../services/GlobService';
import { TYPES } from '../TYPES';

export interface DotnetSdkProjectFile extends ElementCompact {
  Project: ElementCompact & {
    ItemGroup?: ItemGroup | ItemGroup[];
  };
}

export interface ItemGroup extends ElementCompact {
  ProjectReference: DotnetSdkReference | DotnetSdkReference[];
}

export interface DotnetSdkReference {
  _attributes: {
    Include: string;
  };
}

@injectable()
export class DotnetMetadataHandler implements ProjectMetadataLoader {
  readonly extensionPattern = '*.csproj';

  private directoryPropsFiles?: Promise<string[]>;

  private readonly csprojProjectReferences: Record<string, Promise<string[]> | undefined> = {};

  constructor(
    @inject(TYPES.BaseDir) private readonly baseDir: string,
    @inject(TYPES.GlobService) private readonly globService: GlobService,
    @inject(TYPES.FileService) private readonly fileService: FileService,
  ) { }

  async getDirectoryPropsFiles() {
    if (this.directoryPropsFiles) {
      return this.directoryPropsFiles;
    }

    this.directoryPropsFiles = this.globService.glob('Directory.*.props', { nocase: true });
    return this.directoryPropsFiles;
  }

  async loadMetadata(filePath: string): Promise<ProjectMetadata> {
    const projectDependencies = await this.loadCachedProjectReferences(filePath);
    const directoryPropsFiles = await this.getDirectoryPropsFiles();

    const projectDir = dirname(filePath);
    return {
      name: basename(filePath, '.csproj'),
      dependencies: [
        ...projectDependencies,
        // Collect any Directory.*.props files which could impact any of the dependening projects 
        ...directoryPropsFiles.filter(propFile => projectDependencies.some(dir => join(projectDir, dir).replaceAll(/\\/g, '/').startsWith(dirname(propFile))))
      ],
      tags: [
        'project-type:dotnet',
      ],
    };
  }

  /**
   * Follows csproj refs to get all dependencies of the current project
   * @param filePath Path to csproj file
   * @returns List of all directories this project depends on
   */
  async loadCachedProjectReferences(filePath: string): Promise<string[]> {
    const relativePath = relative(this.baseDir, filePath);

    const cached = this.csprojProjectReferences[relativePath];

    if (cached) {
      return cached;
    }

    return this.csprojProjectReferences[relativePath] = this.loadProjectReferences(filePath);
  }

  async loadProjectReferences(filePath: string): Promise<string[]> {
    const xml = await this.fileService.readFileUtf8(filePath);

    const csproj = xml2js(xml, {
      compact: true
    }) as DotnetSdkProjectFile;

    /** Project references relative to the base directory */
    const directCsprojDependencies = [csproj.Project.ItemGroup]
      .flat()
      // Only take item groups which have project references
      .filter((g): g is ItemGroup => !!g && !!g.ProjectReference)
      .flatMap(itemGroup => itemGroup.ProjectReference)
      // Map project references to project dir relative to base dir
      .map(ref => ref._attributes.Include)
      || [];

    /** Project dir dependencies (parent folders of csproj refs) */
    const dirDependencies = [
      ...directCsprojDependencies.map(dirname),
      ...(await Promise.all(
        directCsprojDependencies.map(dep => this.loadCachedProjectReferences(join(dirname(filePath), dep)))
      )).flat()
    ];
    return dirDependencies;
  }
}
