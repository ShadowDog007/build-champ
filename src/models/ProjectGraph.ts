/**
 * A node in the project dependancy graph
 */
export interface ProjectGraph {
  /**
   * Name of the project
   */
  readonly name: string;

  /**
   * Directory this project is in
   */
  readonly dir: string;

  /**
   * List of this projects dependencies
   */
  readonly dependencies: ProjectGraph[];

  /**
   * List of this projects dependants
   */
  readonly dependants: ProjectGraph[];
}

/**
 * Used in earlier processor stages
 */
export const nullProjectGraph: ProjectGraph = null as unknown as ProjectGraph;