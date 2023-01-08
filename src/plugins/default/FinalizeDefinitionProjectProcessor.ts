import { injectable } from 'inversify';
import { uniq } from 'lodash';
import { basename } from 'path';
import 'reflect-metadata';
import { Project } from '../../models/Project';
import { ProjectProcessorPhase, SimpleProjectProcessor } from '../ProjectProcessor';

@injectable()
export class FinalizeDefinitionProjectProcessor extends SimpleProjectProcessor {

  phase = ProjectProcessorPhase.last;

  process(project: Project): Promise<Project> {
    return Promise.resolve({
      extends: project.extends,
      name: project.name || basename(project.dir),
      dir: project.dir,
      dependencies: uniq(project.dependencies).sort(),
      tags: uniq(project.tags).sort(),
      commands: project.commands,
    });
  }
}
