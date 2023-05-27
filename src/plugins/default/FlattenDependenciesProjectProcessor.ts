import { injectable } from 'inversify';
import { uniq } from 'lodash';
import 'reflect-metadata';
import { Project } from '../../models/Project';
import { ProjectProcessor, ProjectProcessorPhase } from '../ProjectProcessor';

/**
 * Flattens dependencies, copying all transitive dependencies
 */
@injectable()
export class FlattenDependenciesProjectProcessor extends ProjectProcessor {

  readonly phase = ProjectProcessorPhase.end;

  async processBatch(projects: Project[]): Promise<Project[]> {
    const dependenciesByDir = Object.fromEntries(projects.map(p => [p.dir.toLocaleUpperCase(), p.dependencies]));
    const todo = Object.keys(dependenciesByDir);

    while (todo.length) {
      const dir = todo.pop();
      if (dir)
        flattenDependenciesFor(dir);
    }

    return projects
      .map(project => ({
        ...project,
        dependencies: uniq(dependenciesByDir[project.dir.toLocaleUpperCase()]).sort()
      }));

    /**
     * Recursively flatten dependencies
     * @param dir
     */
    function flattenDependenciesFor(dir: string) {
      const dependencies = dependenciesByDir[dir];

      for (const dependency of dependencies) {
        const unprocessedIndex = todo.findIndex(t => t.localeCompare(dependency, undefined, { sensitivity: 'base' }) === 0);

        if (unprocessedIndex !== -1) {
          flattenDependenciesFor(todo.splice(unprocessedIndex, 1)[0]);
        }

        const nestedDependencies = dependenciesByDir[dependency.toLocaleUpperCase()];
        if (nestedDependencies) {
          dependencies.push(...nestedDependencies);
        }
      }
    }
  }
}
