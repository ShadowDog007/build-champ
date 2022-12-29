import { readFile } from 'fs/promises';
import { injectable } from 'inversify';
import { concat, uniq } from 'lodash';
import { resolve } from 'path';
import { parse } from 'yaml';
import { ProjectProcessor } from '.';
import { Project } from '../Project';

@injectable()
export class ProjectExtension implements ProjectProcessor {
  async * processProjects(projects: AsyncGenerator<Project>): AsyncGenerator<Project> {
    for await (const project of projects) {

      if (!project.extends) {
        yield project;
        continue;
      }

      const yaml = await readFile(resolve(project.dir, project.extends), 'utf8');

      const extension = parse(yaml) as Partial<Project>;

      yield {
        extends: project.extends,
        name: project.name || extension.name || '',
        dir: project.dir,
        dependencies: concat(extension.dependencies || [], project.dependencies),
        tags: uniq(concat(extension.tags || [], project.tags)).sort(),
        commands: {
          ...extension.commands,
          ...project.commands,
        },
      };
    }
  }
}
