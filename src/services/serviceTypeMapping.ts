import { ServiceTypes } from '.';
import { ContextServiceImpl } from './ContextService';
import { EvalServiceImpl } from './EvalService';
import { FileServiceImpl } from './FileService';
import { GlobServiceImpl } from './GlobService';
import { ProjectServiceImpl } from './ProjectService';
import { RepositoryServiceImpl } from './RepositoryService';
import { SpawnServiceImpl } from './SpawnService';

export const serviceTypeMapping = {
  ContextService: ContextServiceImpl,
  EvalService: EvalServiceImpl,
  FileService: FileServiceImpl,
  GlobService: GlobServiceImpl,
  ProjectService: ProjectServiceImpl,
  RepositoryService: RepositoryServiceImpl,
  SpawnService: SpawnServiceImpl,
} satisfies Record<keyof typeof ServiceTypes, new (...args: never[]) => unknown>;
