import { ContainerModule } from 'inversify';
import { PluginConfiguration } from '../config/PluginConfiguration';

/**
 * Represents an extension of application behaviour
 */
export interface Plugin {
  /**
   * Returns a container module to be loaded into the application
   */
  getContainerModule(configuration: PluginConfiguration): ContainerModule;
}
