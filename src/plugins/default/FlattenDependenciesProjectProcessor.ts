import { injectable } from 'inversify';
import { uniqBy } from 'lodash';
import 'reflect-metadata';
import { Project } from '../../models/Project';
import { ProjectProcessor, ProjectProcessorPhase } from '../ProjectProcessor';
import chalk from 'chalk';
import { BuildChampError } from '../../util/BuildChampError';

/**
 * Flattens dependencies, copying all transitive dependencies
 */
@injectable()
export class FlattenDependenciesProjectProcessor extends ProjectProcessor {

  readonly phase = ProjectProcessorPhase.end;

  async processBatch(projects: Project[]): Promise<Project[]> {
    const remaining = [...projects];
    const complete: Record<string, string[]> = {};

    return projects.map(project => {
      return {
        ...project,
        dependencies: this.getProjectDependencies(project, remaining, complete).sort(),
      };
    });
  }

  getProjectDependencies(project: Project, remaining: Project[], resolvedDependencies: Record<string, string[]>, path: Project[] = []): string[] {
    const projectDirLower = project.dir.toLocaleLowerCase();

    // Short-circuit if this is already completed
    const resolved = resolvedDependencies[projectDirLower];
    if (resolved) {
      return resolved;
    }

    // Check for circular refs
    const pathIndex = path.indexOf(project);
    if (pathIndex !== -1) {
      const circularRefs = path.slice(pathIndex);
      const circularRefsStr = circularRefs.map(ref => `${chalk.blueBright(ref.name)}(${chalk.blue(ref.dir)})`).join(` => `);

      throw new BuildChampError(`${chalk.redBright('Circular reference discovered:')} ${circularRefsStr}`);
    }

    // Collect transitive depdenencies
    const currentDependencies: string[] = [
      ...project.dependencies,
    ];

    for (const dependency of project.dependencies) {
      const otherProject = remaining.find(p => p.dir.localeCompare(dependency, undefined, { sensitivity: 'base' }) === 0);
      if (otherProject) {
        currentDependencies.push(
          ...this.getProjectDependencies(otherProject, remaining, resolvedDependencies, [...path, project])
        );
      }
    }

    remaining.splice(remaining.indexOf(project), 1);
    return resolvedDependencies[projectDirLower] = uniqBy(currentDependencies, a => a.toLocaleLowerCase());
  }
}
