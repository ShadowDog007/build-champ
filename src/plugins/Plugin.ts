import { ContainerModule } from 'inversify';

/**
 * Represents an extension of application behaviour
 */
export interface Plugin {

  pluginIdentifier: symbol;

  /**
   * Returns a container module to be loaded into the application
   */
  getContainerModule(): ContainerModule;
}
