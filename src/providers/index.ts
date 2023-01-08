import { Command } from 'commander';
import { injectable, interfaces } from 'inversify';
import 'reflect-metadata';
import { SimpleGit } from 'simple-git';
import { WorkspaceConfiguration } from '../config/WorkspaceConfiguration';
import { TypeRecord } from '../TYPES';
import { PromiseCache } from '../util/PromiseCache';

@injectable()
export abstract class ValueProvider<T> implements PromiseLike<T> {

  private valueCache = new PromiseCache(() => this.provider());

  protected abstract provider(): Promise<T>;

  then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseLike<TResult1 | TResult2> {
    return this.valueCache.get().then(onfulfilled, onrejected);
  }
}

export const ProviderTypes = {
  BaseDirProvider: Symbol.for('BaseDirProvider') as interfaces.ServiceIdentifier<ValueProvider<string>>,
  GitProvider: Symbol.for('GitProvider') as interfaces.ServiceIdentifier<ValueProvider<SimpleGit>>,
  ProgramProvider: Symbol.for('ProgramProvider') as interfaces.ServiceIdentifier<ValueProvider<Command>>,
  WorkspaceConfigurationProvider: Symbol.for('WorkspaceConfigurationProvider') as interfaces.ServiceIdentifier<ValueProvider<WorkspaceConfiguration>>,
}  satisfies TypeRecord<ValueProvider<unknown>>;
