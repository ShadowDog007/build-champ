import { ProjectMetadata } from '../models/ProjectMetadata';
import { DotnetMetadataHandler } from './DotnetMetadataHandler';

export interface ProjectMetadataLoader {
  /**
   * Glob pattern matching any files within the project direction which should be loaded
   */
  extensionPattern: string;

  loadMetadata(filePath: string): Promise<ProjectMetadata>;
}

export const metadataLoaders = [
  DotnetMetadataHandler,
]satisfies (new (...args: never[]) => ProjectMetadataLoader)[];
