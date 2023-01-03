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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies Record<keyof typeof ServiceTypes, new (...args: any[]) => any>;