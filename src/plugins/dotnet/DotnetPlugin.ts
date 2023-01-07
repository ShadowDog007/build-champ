import { ContainerModule } from 'inversify';
import 'reflect-metadata';
import { Plugin } from '../Plugin';
import { PluginTypes } from '../PluginTypes';
import { DotnetProjectLoader } from './DotnetProjectLoader';
import { DotnetService } from './DotnetService';
import { DotnetTypes } from './DotnetTypes';

export class DotnetPlugin implements Plugin {
  getContainerModule(): ContainerModule {
    return new ContainerModule(bind => {
      bind(PluginTypes.ProjectLoader).to(DotnetProjectLoader);

      bind(DotnetTypes.DotnetService).to(DotnetService);
    });
  }

}
