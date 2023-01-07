import { ProviderTypes } from '.';
import { TypeMappingRecord } from '../TYPES';
import { BaseDirProvider } from './BaseDirProvider';
import { GitProvider } from './GitProvider';
import { ProgramProvider } from './ProgramProvider';
import { WorkspaceConfigurationProvider } from './WorkspaceConfigurationProvider';

export const providerTypeMappings = {
  BaseDirProvider: BaseDirProvider,
  GitProvider: GitProvider,
  ProgramProvider: ProgramProvider,
  WorkspaceConfigurationProvider: WorkspaceConfigurationProvider,
} satisfies TypeMappingRecord<typeof ProviderTypes>;
