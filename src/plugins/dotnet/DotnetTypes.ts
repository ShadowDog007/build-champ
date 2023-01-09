import { interfaces } from 'inversify';

export const DotnetTypes = {
  DotnetConfiguration: Symbol.for('DotnetConfiguration'),
  DotnetService: Symbol.for('DotnetService'),
} satisfies Record<string, interfaces.ServiceIdentifier<unknown>>;
