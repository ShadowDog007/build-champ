import { injectable } from 'inversify';
import 'reflect-metadata';
import { Project } from '../../models/Project';
import { ProjectProcessor, ProjectProcessorPhase } from '../ProjectProcessor';
import { FlattenDependenciesProjectProcessor } from './FlattenDependenciesProjectProcessor';

/**
 * Flattens dependencies, copying all transitive dependencies
 */
@injectable()
export class GraphDependenciesProjectProcessor extends ProjectProcessor {

  readonly phase = ProjectProcessorPhase.end;
  readonly before = [FlattenDependenciesProjectProcessor];

  async processBatch(projects: Project[]): Promise<Project[]> {
    const graphedProjects: Project[] = projects
      .map(p => ({ ...p, graph: { name: p.name, dir: p.dir, dependencies: [], dependants: [] }, }));

    const projectGraphByDir = Object.fromEntries(
      graphedProjects.map(p => [p.dir.toLocaleUpperCase(), p.graph])
    );

    for (const project of graphedProjects) {
      for (const dependency of project.dependencies) {
        const dependantProject = projectGraphByDir[dependency.toLocaleUpperCase()];
        if (dependantProject) {
          // Create two way link
          project.graph.dependencies.push(dependantProject);
          dependantProject.dependants.push(project.graph);
        }
      }

      project.graph.dependencies.sort((a, b) => a.dir.localeCompare(b.dir));
    }

    return graphedProjects;
  }
}
