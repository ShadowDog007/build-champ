import { interfaces } from 'inversify';

export const DotnetTypes = {
  DotnetService: Symbol.for('DotnetService'),
} satisfies Record<string, interfaces.ServiceIdentifier<unknown>>;
