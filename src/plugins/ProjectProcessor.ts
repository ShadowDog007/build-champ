import { injectable, interfaces } from 'inversify';
import { Project } from '../models/Project';

@injectable()
export abstract class ProjectProcessor {
  /**
   * Phase to execute this processor
   *
   * @default ProjectProcessorPhase.middle
   */
  phase?: ProjectProcessorPhase;

  /**
   * Collection of processors which this processor should run before
   */
  readonly before?: interfaces.Newable<ProjectProcessor>[];

  /**
   * * Collection of processors which this processor should run after
   */
  readonly after?: interfaces.Newable<ProjectProcessor>[];

  /**
   * Update all projects
   * @param projects
   */
  abstract processBatch(projects: Project[]): Promise<Project[]>;
}

@injectable()
export abstract class SimpleProjectProcessor extends ProjectProcessor {
  /**
   * Check if this project is relevant to this processor
   * @param project
   */
  canProcess?(project: Project): boolean;

  /**
   * Update the project
   * @param project
   */
  abstract process(project: Project): Promise<Project>;

  async processBatch(projects: Project[]): Promise<Project[]> {
    return Promise.all(
      projects.map(project =>
        this.canProcess === undefined || this.canProcess(project)
          ? this.process(project)
          : project)
    );
  }
}

export enum ProjectProcessorPhase {
  first,
  start,
  middle,
  end,
  last,
}

export interface ProjectProcessorOrder {
  phase?: ProjectProcessorPhase;

  before?: interfaces.Newable<ProjectProcessor>;
  after?: interfaces.Newable<ProjectProcessor>;
}