import { interfaces } from 'inversify';
import { ProjectLoader } from './ProjectLoader';
import { ProjectProcessor } from './ProjectProcessor';

export const PluginTypes = {
  PluginIdentifierConfigMapping: Symbol.for('PluginIdentifierConfigMapping') as interfaces.ServiceIdentifier<[symbol, string]>,
  ProjectLoader: Symbol.for('ProjectLoader') as interfaces.ServiceIdentifier<ProjectLoader>,
  ProjectProcessor: Symbol.for('ProjectProcessor') as interfaces.ServiceIdentifier<ProjectProcessor>,
} satisfies Record<string, interfaces.ServiceIdentifier<unknown>>;