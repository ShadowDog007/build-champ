import { Command } from 'commander';
import { injectable, interfaces } from 'inversify';
import 'reflect-metadata';
import { SimpleGit } from 'simple-git';
import { WorkspaceConfiguration } from '../config/WorkspaceConfiguration';
import { TypeRecord } from '../TYPES';
import { PromiseCache } from '../util/PromiseCache';

@injectable()
export abstract class Provider<T> implements Provider<T> {

  private valueCache = new PromiseCache(() => this.provider());

  protected abstract provider(): Promise<T>;

  get(): Promise<T> {
    return this.valueCache.get();
  }
}

export const ProviderTypes = {
  BaseDirProvider: Symbol.for('BaseDirProvider') as interfaces.ServiceIdentifier<Provider<string>>,
  GitProvider: Symbol.for('GitProvider') as interfaces.ServiceIdentifier<Provider<SimpleGit>>,
  ProgramProvider: Symbol.for('ProgramProvider') as interfaces.ServiceIdentifier<Provider<Command>>,
  WorkspaceConfigurationProvider: Symbol.for('WorkspaceConfigurationProvider') as interfaces.ServiceIdentifier<Provider<WorkspaceConfiguration>>,
}  satisfies TypeRecord<Provider<unknown>>;
