import { ProjectCommand } from './ProjectCommand';
import { ProjectGraph } from './ProjectGraph';
import { ProjectVersion } from './ProjectVersion';

/**
 * Reference to a project and it's commands
 */
export interface Project {
  /**
   * Path to a project definition extension relative to this file
   */
  readonly extends?: string;

  /**
   * Name of the project
   */
  readonly name: string;

  /**
   * Directory of the project
   */
  readonly dir: string;

  /**
   * List of files/directories this project depends on
   */
  readonly dependencies: string[];

  /**
   * Graph of project dependencies
   */
  readonly graph: ProjectGraph;

  /**
   * Collection of commands relevant to this project
   */
  readonly commands: {
    [K in string]: ProjectCommand | ProjectCommand[]
  };

  /**
   * Tags for this project
   */
  readonly tags: string[];
}

export interface ProjectWithVersion extends Project {
  version: ProjectVersion;
}
