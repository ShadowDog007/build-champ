import { Command } from 'commander';
import { injectable, ServiceIdentifier } from 'inversify';
import 'reflect-metadata';
import { PluginConfiguration } from '../config/PluginConfiguration';
import { WorkspaceConfiguration } from '../config/WorkspaceConfiguration';
import { TypeRecord } from '../TYPES';
import { PromiseCache } from '../util/PromiseCache';
import { PathScurry } from 'path-scurry';
import { GitIgnore } from './GitIgnoreProvider';

export type ProviderFunction<T, K extends string | symbol | undefined = undefined>
  = K extends string | symbol
  ? (key: K) => Promise<T>
  : () => Promise<T>;

@injectable()
export abstract class Provider<T, K extends string | symbol | undefined = undefined> {

  private valueCache = new PromiseCache<T, K>(
    ((key: K) => this.provider(key as never)) as ProviderFunction<T, K>
  );

  protected abstract provider(key: K): Promise<T>;

  get(key?: K): Promise<T> {
    return this.valueCache.get(key as never);
  }
}

export const ProviderTypes = {
  BaseDirProvider: Symbol.for('BaseDirProvider') as ServiceIdentifier<Provider<string>>,
  GitIgnoreProvider: Symbol.for('GitIgnoreProvider') as ServiceIdentifier<Provider<GitIgnore>>,
  PathScurryProvider: Symbol.for('PathScurryProvider') as ServiceIdentifier<Provider<PathScurry>>,
  PluginConfigurationProvider: Symbol.for('PluginConfigurationProvider') as ServiceIdentifier<Provider<PluginConfiguration, symbol>>,
  ProgramProvider: Symbol.for('ProgramProvider') as ServiceIdentifier<Provider<Command>>,
  WorkspaceConfigurationProvider: Symbol.for('WorkspaceConfigurationProvider') as ServiceIdentifier<Provider<WorkspaceConfiguration>>,
} satisfies TypeRecord<Provider<unknown> | Provider<unknown, string> | Provider<unknown, symbol>>;
