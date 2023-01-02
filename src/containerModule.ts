import { Command } from 'commander';
import { ContainerModule } from 'inversify';
import 'reflect-metadata';
import { version } from '../package.json';
import { BaseProjectCommand } from './cli/BaseProjectCommand';
import { InitCommand } from './cli/InitCommand';
import { ListCommand } from './cli/ListCommand';
import { RunCommand } from './cli/RunCommand';
import { TemplateCommand } from './cli/TemplateCommand';
import { ProjectMetadataLoader } from './metadata';
import { DotnetMetadataHandler } from './metadata/DotnetMetadataHandler';
import { ProjectProcessor } from './processors';
import { FinalizeDefinition } from './processors/FinalizeDefinition';
import { FlattenDependencies } from './processors/FlattenDependencies';
import { LoadProjectMetadata } from './processors/LoadProjectMetadata';
import { ProjectExtension } from './processors/ProjectExtension';
import { ResolveDependencies } from './processors/ResolveDependencies';
import { BaseDirProvider, BaseDirProviderImpl } from './providers/BaseDirProvider';
import { GitProvider } from './providers/GitProvider';
import { ContextService, ContextServiceImpl } from './services/ContextService';
import { EvalService, EvalServiceImpl } from './services/EvalService';
import { GlobService, GlobServiceImpl } from './services/GlobService';
import { ProjectService, ProjectServiceImpl } from './services/ProjectService';
import { RepositoryService, RepositoryServiceImpl } from './services/RepositoryService';
import { SpawnService, SpawnServiceImpl } from './services/SpawnService';
import { TYPES } from './TYPES';

export const containerModule = new ContainerModule((bind, _, isBound) => {
  bind(TYPES.Command).to(InitCommand);
  bind(TYPES.Command).to(ListCommand);
  bind(TYPES.Command).to(RunCommand);
  bind(TYPES.Command).to(TemplateCommand);

  bind(TYPES.Program).toDynamicValue(c => {
    const program = new Command();
    program.version(version);
    c.container.getAll<BaseProjectCommand<unknown[]>>(TYPES.Command).forEach(c => program.addCommand(c.command));
    return program;
  });

  bind<BaseDirProvider>(TYPES.BaseDirProvider).to(BaseDirProviderImpl).inSingletonScope();
  if (!isBound(TYPES.BaseDir)) {
    bind<string>(TYPES.BaseDir)
      .toDynamicValue(c => c.container.get<BaseDirProvider>(TYPES.BaseDirProvider).baseDir);
  }

  bind<ContextService>(TYPES.ContextService).to(ContextServiceImpl).inSingletonScope();
  bind<EvalService>(TYPES.EvalService).to(EvalServiceImpl).inSingletonScope();
  bind<GitProvider>(TYPES.GitProvider).to(GitProvider).inSingletonScope();
  bind<GlobService>(TYPES.GlobService).to(GlobServiceImpl).inSingletonScope();
  bind<ProjectService>(TYPES.ProjectService).to(ProjectServiceImpl).inSingletonScope();
  bind<RepositoryService>(TYPES.RepositoryService).to(RepositoryServiceImpl).inSingletonScope();
  bind<SpawnService>(TYPES.SpawnService).to(SpawnServiceImpl).inSingletonScope();

  // Project processors in the order they need to be processed
  bind<ProjectProcessor>(TYPES.ProjectProcessor).to(ProjectExtension).inSingletonScope();
  bind<ProjectProcessor>(TYPES.ProjectProcessor).to(ResolveDependencies).inSingletonScope();
  bind<ProjectProcessor>(TYPES.ProjectProcessor).to(LoadProjectMetadata).inSingletonScope();
  bind<ProjectProcessor>(TYPES.ProjectProcessor).to(FlattenDependencies).inSingletonScope();
  bind<ProjectProcessor>(TYPES.ProjectProcessor).to(FinalizeDefinition).inSingletonScope();

  bind<ProjectMetadataLoader>(TYPES.ProjectMetadataHandler).to(DotnetMetadataHandler).inSingletonScope();
});
