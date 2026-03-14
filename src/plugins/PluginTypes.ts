import { ServiceIdentifier } from 'inversify';
import { ProjectLoader } from './ProjectLoader';
import { ProjectProcessor } from './ProjectProcessor';

export const PluginTypes = {
  PluginIdentifierConfigMapping: Symbol.for('PluginIdentifierConfigMapping') as ServiceIdentifier<[symbol, string]>,
  ProjectLoader: Symbol.for('ProjectLoader') as ServiceIdentifier<ProjectLoader>,
  ProjectProcessor: Symbol.for('ProjectProcessor') as ServiceIdentifier<ProjectProcessor>,
} satisfies Record<string, ServiceIdentifier<unknown>>;