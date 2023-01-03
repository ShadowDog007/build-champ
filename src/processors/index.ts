import { Project } from '../models/Project';
import { FinalizeDefinition } from './FinalizeDefinition';
import { FlattenDependencies } from './FlattenDependencies';
import { LoadProjectMetadata } from './LoadProjectMetadata';
import { ProjectExtension } from './ProjectExtension';
import { ResolveDependencies } from './ResolveDependencies';

export interface ProjectProcessor {
  processProjects(projects: AsyncGenerator<Project>): AsyncGenerator<Project>;
}

export const processors = [
  ProjectExtension,
  LoadProjectMetadata,
  ResolveDependencies,
  FlattenDependencies,
  FinalizeDefinition,
]satisfies (new (...args: never[]) => ProjectProcessor)[];
