import { Project } from '../models/Project';

/**
 * Loader registered from a plugin
 */
export interface ProjectLoader<TProject extends Project = Project> {
  /**
   * Pattern to match directories/projects to load as projects
   */
  readonly include: string;

  /**
   * Pattern to exclude directories/projects when loading projects
   */
  readonly exclude?: string;

  /**
   * Load the project from the provided match
   */
  loadProject(match: string): Promise<TProject>;
}