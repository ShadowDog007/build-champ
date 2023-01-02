import { Project } from '../models/Project';

export interface ProjectProcessor {
  processProjects(projects: AsyncGenerator<Project>): AsyncGenerator<Project>;
}
