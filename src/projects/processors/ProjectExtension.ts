import { readFile } from 'fs/promises';
import { inject, injectable } from 'inversify';
import { concat } from 'lodash';
import { dirname, relative, resolve } from 'path';
import 'reflect-metadata';
import { parse } from 'yaml';
import { ProjectProcessor } from '.';
import { TYPES } from '../../TYPES';
import { Project } from '../Project';

export type ProjectExtensionFile = Partial<Omit<Project, 'dir'>>;

export interface ProjectWithExtends extends Project {
  readonly extends: string;
}

@injectable()
export class ProjectExtension implements ProjectProcessor {
  private readonly extensionFiles: Record<string, ProjectExtensionFile> = {};

  constructor(
    @inject(TYPES.BaseDir) private readonly baseDir: string,
  ) { }

  async * processProjects(projects: AsyncGenerator<Project>): AsyncGenerator<Project> {
    for await (let project of projects) {

      if (!project.extends) {
        yield project;
        continue;
      }

      let extensionFile: string | undefined = project.extends;

      do {
        const resolvedExtensionFile = resolve(this.baseDir, project.dir, extensionFile);
        const extension: ProjectExtensionFile = await this.getExtension(resolvedExtensionFile);

        project = this.mergeProjects(extensionFile, extension, project);


        extensionFile = extension.extends ? relative(project.dir, resolve(dirname(resolvedExtensionFile), extension.extends)) : undefined;
      } while (extensionFile);

      yield project;
    }
  }

  async getExtension(file: string): Promise<ProjectExtensionFile> {
    if (this.extensionFiles[file]) {
      return this.extensionFiles[file];
    }

    const yaml = await readFile(file, 'utf8');
    const extension = this.extensionFiles[file] = parse(yaml) as ProjectExtensionFile;
    return extension;
  }

  mergeProjects(extensionFile: string, extension: ProjectExtensionFile, project: Project): Project {
    return {
      extends: project.extends,
      name: project.name || extension.name || '',
      dir: project.dir,
      dependencies: concat(
        extension.dependencies?.map(d => relative(project.dir, resolve(project.dir, dirname(extensionFile), d))) || [],
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
