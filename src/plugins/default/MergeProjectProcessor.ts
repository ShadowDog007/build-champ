import { Project } from '../../models/Project';
import { ProjectProcessor, ProjectProcessorPhase } from '../ProjectProcessor';

export class MergeProjectProcessor extends ProjectProcessor {
  phase = ProjectProcessorPhase.start;

  processBatch(projects: Project[]): Promise<Project[]> {

    const mergedProjects = new Map<string, Project>;
    for (const project of projects) {
      const matchingProject = mergedProjects.get(project.dir);
      if (!matchingProject) {
        mergedProjects.set(project.dir, project);
      } else {
        mergedProjects.set(project.dir,
          this.mergeProjects(matchingProject, project));
      }
    }

    return Promise.resolve(Array.from(mergedProjects.values()));
  }

  mergeProjects(project1: Project, project2: Project): Project {
    return {
      extends: project1.extends || project2.extends,
      name: project1.name || project2.name,
      dir: project1.dir,
      dependencies: [...project1.dependencies, ...project2.dependencies],
      commands: {
        ...project2.commands,
        ...project1.commands,
      },
      tags: [...project1.tags, ...project2.tags],
    };
  }
}