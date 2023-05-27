import { interfaces } from 'inversify';
import { PluginTypes } from './plugins/PluginTypes';
import { ProviderTypes } from './providers';
import { ServiceTypes } from './services';

export type TypeRecord<T = unknown> = { readonly [type: string]: interfaces.ServiceIdentifier<T>; };

export type TypeMappingRecord<T extends TypeRecord> = { readonly [Type in keyof T]: T[Type] extends interfaces.ServiceIdentifier<infer Impl> ? interfaces.Newable<Impl> : never };

export const singleInjectTypes = {
  ...ProviderTypes,
  ...ServiceTypes,
} satisfies TypeRecord;

export const multiInjectTypes = {
  ...PluginTypes,
  Command: Symbol.for('Command'),
} satisfies TypeRecord;

export const TYPES = {
  ...singleInjectTypes,
  ...multiInjectTypes,
} satisfies TypeRecord;