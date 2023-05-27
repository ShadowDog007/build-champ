import { ServiceTypes } from '.';
import { TypeMappingRecord } from '../TYPES';
import { ContextServiceImpl } from './ContextService';
import { EvalServiceImpl } from './EvalService';
import { FileServiceImpl } from './FileService';
import { GlobServiceImpl } from './GlobService';
import { ProjectLoaderServiceImpl } from './ProjectLoaderService';
import { ProjectServiceImpl } from './ProjectService';
import { RepositoryServiceImpl } from './RepositoryService';
import { SpawnServiceImpl } from './SpawnService';

export const serviceTypeMapping = {
  ContextService: ContextServiceImpl,
  EvalService: EvalServiceImpl,
  FileService: FileServiceImpl,
  GlobService: GlobServiceImpl,
  ProjectService: ProjectServiceImpl,
  ProjectLoaderService: ProjectLoaderServiceImpl,
  RepositoryService: RepositoryServiceImpl,
  SpawnService: SpawnServiceImpl,
} satisfies TypeMappingRecord<typeof ServiceTypes>;
