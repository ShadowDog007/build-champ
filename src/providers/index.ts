import { Command } from 'commander';
import { injectable, interfaces } from 'inversify';
import 'reflect-metadata';
import { SimpleGit } from 'simple-git';
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
  BaseDirProvider: Symbol.for('BaseDirProvider') as interfaces.ServiceIdentifier<Provider<string>>,
  GitIgnoreProvider: Symbol.for('GitIgnoreProvider') as interfaces.ServiceIdentifier<Provider<GitIgnore>>,
  GitProvider: Symbol.for('GitProvider') as interfaces.ServiceIdentifier<Provider<SimpleGit>>,
  PathScurryProvider: Symbol.for('PathScurryProvider') as interfaces.ServiceIdentifier<Provider<PathScurry>>,
  PluginConfigurationProvider: Symbol.for('PluginConfigurationProvider') as interfaces.ServiceIdentifier<Provider<PluginConfiguration, symbol>>,
  ProgramProvider: Symbol.for('ProgramProvider') as interfaces.ServiceIdentifier<Provider<Command>>,
  WorkspaceConfigurationProvider: Symbol.for('WorkspaceConfigurationProvider') as interfaces.ServiceIdentifier<Provider<WorkspaceConfiguration>>,
} satisfies TypeRecord<Provider<unknown> | Provider<unknown, string> | Provider<unknown, symbol>>;
