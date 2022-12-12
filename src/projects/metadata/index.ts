import { ProjectMetadata } from '../ProjectMetadata';

export interface ProjectMetadataLoader {
  /**
   * Glob pattern matching any files within the project direction which should be loaded
   */
  extensionPattern: string;

  loadMetadata(filePath: string): Promise<ProjectMetadata>;
}
