import { injectable } from 'inversify';
import { uniq } from 'lodash';
import { ProjectProcessor } from '.';
import { Project } from '../Project';

/**
 * Flattens dependencies, copying all transitive dependencies
 */
@injectable()
export class FlattenDependencies implements ProjectProcessor {
  async * processProjects(projectsIterator: AsyncGenerator<Project>): AsyncGenerator<Project> {
    // Collect projects in same order they are processed
    const projects: Project[] = [];

    for await (const project of projectsIterator) {
      projects.push(project);
    }

    const dependenciesByDir = Object.fromEntries(projects.map(p => [p.dir.toLocaleUpperCase(), p.dependencies]));
    const todo = Object.keys(dependenciesByDir);

    while (todo.length) {
      const dir = todo.pop();
      if (dir)
        flattenDependenciesFor(dir);
    }

    for (const project of projects) {
      yield {
        ...project,
        dependencies: uniq(dependenciesByDir[project.dir.toLocaleUpperCase()]).sort(),
      };
    }

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
