import { ProviderTypes, ValueProvider } from '.';
import { BaseDirProvider } from './BaseDirProvider';
import { GitProvider } from './GitProvider';
import { ProgramProvider } from './ProgramProvider';

export const providerTypeMappings = {
  BaseDirProvider: BaseDirProvider,
  GitProvider: GitProvider,
  ProgramProvider: ProgramProvider,
} satisfies Record<keyof typeof ProviderTypes, new (...args: never[]) => ValueProvider<unknown>>;
