import { Project } from '../Project';

export interface ProjectProcessor {
  processProjects(projects: AsyncGenerator<Project>): AsyncGenerator<Project>;
}
