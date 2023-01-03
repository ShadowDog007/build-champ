import { inject, injectable } from 'inversify';
import { concat } from 'lodash';
import { dirname, join, relative } from 'path';
import 'reflect-metadata';
import { ProjectProcessor } from '.';
import { Project } from '../models/Project';
import { FileService } from '../services/FileService';
import { TYPES } from '../TYPES';

export type ProjectExtensionFile = Partial<Omit<Project, 'dir'>>;

export interface ProjectWithExtends extends Project {
  readonly extends: string;
}

@injectable()
export class ProjectExtension implements ProjectProcessor {
  private readonly extensionFiles: Record<string, ProjectExtensionFile> = {};

  constructor(
    @inject(TYPES.BaseDir) private readonly baseDir: string,
    @inject(TYPES.FileService) private readonly fileService: FileService,
  ) { }

  async * processProjects(projects: AsyncGenerator<Project>): AsyncGenerator<Project> {
    for await (let project of projects) {

      if (!project.extends) {
        yield project;
        continue;
      }

      let extensionFile: string | undefined = project.extends;

      do {
        const extensionFileAbsolute = join(project.dir, extensionFile);
        const extension: ProjectExtensionFile = await this.getExtension(extensionFileAbsolute);

        project = this.mergeProjects(extensionFile, extension, project);


        extensionFile = extension.extends ? relative(project.dir, join(dirname(extensionFileAbsolute), extension.extends)) : undefined;
      } while (extensionFile);

      yield project;
    }
  }

  async getExtension(file: string): Promise<ProjectExtensionFile> {
    if (this.extensionFiles[file]) {
      return this.extensionFiles[file];
    }

    return this.extensionFiles[file] = await this.fileService.readFileYaml<ProjectExtensionFile>(file);
  }

  mergeProjects(extensionFile: string, extension: ProjectExtensionFile, project: Project): Project {
    return {
      extends: project.extends,
      name: project.name || extension.name || '',
      dir: project.dir,
      dependencies: concat(
        extension.dependencies?.map(d => relative(project.dir, join(project.dir, dirname(extensionFile), d))) || [],
        project.dependencies
      ),
      tags: concat(extension.tags || [], project.tags),
      commands: {
        ...extension.commands,
        ...project.commands,
      },
    };
  }
}
