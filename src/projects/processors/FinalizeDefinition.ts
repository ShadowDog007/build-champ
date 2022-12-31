import { injectable } from 'inversify';
import { uniq } from 'lodash';
import { basename } from 'path';
import 'reflect-metadata';
import { ProjectProcessor } from '.';
import { Project } from '../Project';

@injectable()
export class FinalizeDefinition implements ProjectProcessor {
  async * processProjects(projects: AsyncGenerator<Project>): AsyncGenerator<Project> {
    for await (const project of projects) {
      yield {
        extends: project.extends,
        name: project.name || basename(project.dir),
        dir: project.dir,
        dependencies: uniq(project.dependencies).sort(),
        tags: uniq(project.tags).sort(),
        commands: project.commands,
      };
    }
  }
}
