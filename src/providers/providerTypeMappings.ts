import { ProviderTypes } from '.';
import { TypeMappingRecord } from '../TYPES';
import { BaseDirProvider } from './BaseDirProvider';
import { GitIgnoreProvider } from './GitIgnoreProvider';
import { GitProvider } from './GitProvider';
import { PathScurryProvider } from './PathScurryProvider';
import { PluginConfigurationProvider } from './PluginConfigurationProvider';
import { ProgramProvider } from './ProgramProvider';
import { WorkspaceConfigurationProvider } from './WorkspaceConfigurationProvider';

export const providerTypeMappings = {
  BaseDirProvider: BaseDirProvider,
  GitIgnoreProvider: GitIgnoreProvider,
  GitProvider: GitProvider,
  PathScurryProvider: PathScurryProvider,
  PluginConfigurationProvider: PluginConfigurationProvider,
  ProgramProvider: ProgramProvider,
  WorkspaceConfigurationProvider: WorkspaceConfigurationProvider,
} satisfies TypeMappingRecord<typeof ProviderTypes>;
