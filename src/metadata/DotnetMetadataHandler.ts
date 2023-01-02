import { readFile } from 'fs/promises';
import { inject, injectable } from 'inversify';
import { basename, dirname, relative, resolve } from 'path';
import 'reflect-metadata';
import { ElementCompact, xml2js } from 'xml-js';
import { ProjectMetadataLoader } from '.';
import { ProjectMetadata } from '../models/ProjectMetadata';
import { BaseDirProvider } from '../providers/BaseDirProvider';
import { TYPES } from '../TYPES';
import { globAsync } from '../util/globAsync';

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

  private readonly baseDir: string;
  private directoryPropsFiles?: Promise<string[]>;

  private readonly csprojProjectReferences: Record<string, Promise<string[]> | undefined> = {};

  constructor(
    @inject(TYPES.BaseDirProvider) baseDirProvider: BaseDirProvider
  ) {
    this.baseDir = baseDirProvider.baseDir;
  }

  async getDirectoryPropsFiles() {
    if (this.directoryPropsFiles) {
      return this.directoryPropsFiles;
    }

    this.directoryPropsFiles = globAsync('Directory.*.props', { cwd: this.baseDir, nocase: true });
    return this.directoryPropsFiles;
  }

  async loadMetadata(filePath: string): Promise<ProjectMetadata> {
    const projectDependencies = await this.loadCachedProjectReferences(filePath);
    const directoryPropsFiles = await this.getDirectoryPropsFiles();
    return {
      name: basename(filePath, '.csproj'),
      dependencies: [
        ...projectDependencies,
        // Collect any Directory.*.props files which could impact any of the dependening projects 
        ...directoryPropsFiles.filter(propFile => projectDependencies.some(dir => resolve(this.baseDir, dir).startsWith(resolve(this.baseDir, dirname(propFile)))))
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
    const xml = await readFile(filePath, { encoding: 'utf8' });

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
      .map(ref => relative(this.baseDir, resolve(dirname(filePath), ref._attributes.Include)))
      || [];

    /** Project dir dependencies (parent folders of csproj refs) */
    const dirDependencies = [
      ...directCsprojDependencies.map(dirname),
      ...(await Promise.all(
        directCsprojDependencies.map(dep => this.loadCachedProjectReferences(resolve(this.baseDir, dep)))
      )).flat()
    ];
    return dirDependencies;
  }
}