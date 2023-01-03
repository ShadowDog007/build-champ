import { ProviderTypes, ProviderValueTypes } from './providers';
import { ServiceTypes } from './services';

export const singleInjectTypes = {
  ...ProviderTypes,
  ...ProviderValueTypes,
  ...ServiceTypes,
};

export const multiInjectTypes = {
  Command: Symbol.for('Command'),
  ProjectMetadataHandler: Symbol.for('ProjectMetadataHandler'),
  ProjectProcessor: Symbol.for('ProjectProcessor'),
};

export const TYPES = {
  ...singleInjectTypes,
  ...multiInjectTypes,
};
