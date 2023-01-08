import { ContainerModule } from 'inversify';
import { Plugin } from '../Plugin';
import { PluginTypes } from '../PluginTypes';
import { DefaultProjectLoader } from './DefaultProjectLoader';
import { FinalizeDefinitionProjectProcessor } from './FinalizeDefinitionProjectProcessor';
import { FlattenDependenciesProjectProcessor } from './FlattenDependenciesProjectProcessor';
import { ResolveDependencies as ResolveDependenciesProjectProcessor } from './ResolveDependenciesProjectProcessor';

export class DefaultPlugin implements Plugin {
  getContainerModule(): ContainerModule {
    return new ContainerModule(bind => {
      bind(PluginTypes.ProjectLoader).to(DefaultProjectLoader);

      bind(PluginTypes.ProjectProcessor).to(ResolveDependenciesProjectProcessor);
      bind(PluginTypes.ProjectProcessor).to(FlattenDependenciesProjectProcessor);
      bind(PluginTypes.ProjectProcessor).to(FinalizeDefinitionProjectProcessor);
    });
  }
}
