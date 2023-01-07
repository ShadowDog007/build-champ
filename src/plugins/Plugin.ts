import { ContainerModule } from 'inversify';

/**
 * Represents an extension of application behaviour
 */
export interface Plugin {
  /**
   * Returns a container module to be loaded into the application
   */
  getContainerModule(): ContainerModule;
}
