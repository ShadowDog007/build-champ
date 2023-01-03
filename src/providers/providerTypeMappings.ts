import { ProviderTypes, ValueProvider } from '.';
import { BaseDirProvider } from './BaseDirProvider';
import { GitProvider } from './GitProvider';
import { ProgramProvider } from './ProgramProvider';

export const providerTypeMappings = {
  BaseDirProvider: BaseDirProvider,
  GitProvider: GitProvider,
  ProgramProvider: ProgramProvider,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies Record<keyof typeof ProviderTypes, new (...args: any[]) => ValueProvider<unknown>>;
