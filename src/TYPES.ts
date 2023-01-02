export const singleInjectTypes = {
  BaseDir: Symbol.for('BaseDir'),
  BaseDirProvider: Symbol.for('BaseDirProvider'),
  ContextService: Symbol.for('ContextService'),
  EvalService: Symbol.for('EvalService'),
  GitProvider: Symbol.for('GitProvider'),
  GlobService: Symbol.for('GlobService'),
  Program: Symbol.for('Program'),
  ProjectService: Symbol.for('ProjectService'),
  SpawnService: Symbol.for('SpawnService'),
  RepositoryService: Symbol.for('RepositoryService'),
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
