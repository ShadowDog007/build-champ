import { interfaces } from 'inversify';
import { ProjectLoader } from './ProjectLoader';
import { ProjectProcessorBase } from './ProjectProcessor';

export const PluginTypes = {
  ProjectLoader: Symbol.for('ProjectLoader') as interfaces.ServiceIdentifier<ProjectLoader>,
  ProjectProcessor: Symbol.for('ProjectProcessor') as interfaces.ServiceIdentifier<ProjectProcessorBase>,
} satisfies Record<string, interfaces.ServiceIdentifier<unknown>>;