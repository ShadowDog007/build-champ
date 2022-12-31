import { Command } from 'commander';
import { ContainerModule } from 'inversify';
import 'reflect-metadata';
import { version } from '../package.json';
import { BaseProjectCommand } from './cli/BaseProjectCommand';
import { InitCommand } from './cli/InitCommand';
import { ListCommand } from './cli/ListCommand';
import { RunCommand } from './cli/RunCommand';
import { TemplateCommand } from './cli/TemplateCommand';
import { ProjectMetadataLoader } from './projects/metadata';
import { DotnetMetadataHandler } from './projects/metadata/DotnetMetadataHandler';
import { ProjectProcessor } from './projects/processors';
import { FinalizeDefinition } from './projects/processors/FinalizeDefinition';
import { FlattenDependencies } from './projects/processors/FlattenDependencies';
import { LoadProjectMetadata } from './projects/processors/LoadProjectMetadata';
import { ProjectExtension } from './projects/processors/ProjectExtension';
import { ResolveDependencies } from './projects/processors/ResolveDependencies';
import { ProjectService, ProjectServiceImpl } from './projects/ProjectService';
import { TYPES } from './TYPES';
import { BaseDirProvider, BaseDirProviderImpl } from './util/BaseDirProvider';
import { EvalService, EvalServiceImpl } from './util/EvalService';
import { GitProvider } from './util/GitProvider';
import { RepositoryService, RepositoryServiceImpl } from './util/RepositoryService';
import { SpawnService, SpawnServiceImpl } from './util/SpawnService';

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

  bind<EvalService>(TYPES.EvalService).to(EvalServiceImpl).inSingletonScope();
  bind<GitProvider>(TYPES.GitProvider).to(GitProvider).inSingletonScope();
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
