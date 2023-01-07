import { Project } from '../../models/Project';
import { ProjectProcessor, ProjectProcessorPhase } from '../ProjectProcessor';

export class MergeProjectProcessor extends ProjectProcessor {
  phase = ProjectProcessorPhase.start;

  processBatch(projects: Project[]): Promise<Project[]> {

    const mergedProjects = new Map<string, Project>;
    for (const project of projects) {
      if (!mergedProjects.has(project.dir)) {
        mergedProjects.set(project.dir, project);
      } else {
        mergedProjects.set(project.dir,
          this.mergeProjects(mergedProjects.get(project.dir), project));
      }
    }

    return Promise.resolve(Object.values(mergedProjects));
  }

  mergeProjects(project1: Project | undefined, project2: Project): Project {
    if (!project1) {
      return project2;
    }
    return {
      extends: project1.extends || project2.extends,
      name: project1.name || project2.name,
      dir: project1.dir,
      dependencies: [...project1.dependencies, ...project2.dependencies],
      commands: {
        ...project1.commands,
        ...project2.commands,
      },
      tags: [...project1.tags, ...project2.tags],
    };
  }
}