import { ContainerModule } from 'inversify';
import { Plugin } from '../Plugin';
import { PluginTypes } from '../PluginTypes';
import { DefaultProjectLoader } from './DefaultProjectLoader';
import { FinalizeDefinitionProjectProcessor } from './FinalizeDefinitionProjectProcessor';
import { FlattenDependenciesProjectProcessor } from './FlattenDependenciesProjectProcessor';
import { ResolveDependencies as ResolveDependenciesProjectProcessor } from './ResolveDependenciesProjectProcessor';
import { GraphDependenciesProjectProcessor } from './GraphDependenciesProjectProcessor';

export class DefaultPlugin implements Plugin {

  static pluginIdentifier = Symbol.for('DefaultPlugin');
  get pluginIdentifier() {
    return DefaultPlugin.pluginIdentifier;
  }

  getContainerModule(): ContainerModule {
    return new ContainerModule(bind => {
      bind(PluginTypes.ProjectLoader).to(DefaultProjectLoader);

      bind(PluginTypes.ProjectProcessor).to(ResolveDependenciesProjectProcessor);
      bind(PluginTypes.ProjectProcessor).to(FlattenDependenciesProjectProcessor);
      bind(PluginTypes.ProjectProcessor).to(FinalizeDefinitionProjectProcessor);
      bind(PluginTypes.ProjectProcessor).to(GraphDependenciesProjectProcessor);
    });
  }
}
