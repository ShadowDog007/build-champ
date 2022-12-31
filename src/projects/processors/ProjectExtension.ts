import { readFile } from 'fs/promises';
import { inject, injectable } from 'inversify';
import { concat } from 'lodash';
import { dirname, relative, resolve } from 'path';
import 'reflect-metadata';
import { parse } from 'yaml';
import { ProjectProcessor } from '.';
import { TYPES } from '../../TYPES';
import { Project } from '../Project';

@injectable()
export class ProjectExtension implements ProjectProcessor {
  constructor(
    @inject(TYPES.BaseDir) private readonly baseDir: string,
  ) { }

  async * processProjects(projects: AsyncGenerator<Project>): AsyncGenerator<Project> {
    for await (const project of projects) {

      if (!project.extends) {
        yield project;
        continue;
      }

      const extendsFile = project.extends;

      const yaml = await readFile(resolve(this.baseDir, project.dir, project.extends), 'utf8');

      const extension = parse(yaml) as Partial<Project>;

      yield {
        extends: project.extends,
        name: project.name || extension.name || '',
        dir: project.dir,
        dependencies: concat(
          extension.dependencies?.map(d => relative(project.dir, resolve(project.dir, dirname(extendsFile), d))) || [],
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
}
