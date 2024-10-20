jest.mock('fs');
jest.mock('fs/promises');

import { Container } from 'inversify';
import { fs } from 'memfs';
import { basename, join } from 'path';
import 'reflect-metadata';
import { DotnetPlugin } from '../../../src/plugins/dotnet/DotnetPlugin';
import { DotnetProjectLoader } from '../../../src/plugins/dotnet/DotnetProjectLoader';
import { PluginTypes } from '../../../src/plugins/PluginTypes';
import { ProviderTypes } from '../../../src/providers';
import { createContainer, resetFs } from '../../mocks';
import { addCsproj } from './helper';
import { ProjectLoaderService, ProjectLoaderServiceImpl } from '../../../src/services/ProjectLoaderService';
import { writeFile } from 'fs/promises';

describe(DotnetProjectLoader, () => {
  let container: Container;
  let loader: DotnetProjectLoader;
  let projectLoaderService: ProjectLoaderService;
  let baseDir: string;

  let csprojPath: string;
  let dependencyCsprojPath: string;
  let testCsprojPath: string;

  beforeEach(async () => {
    await resetFs();
    container = await createContainer();
    loader = container.resolve(DotnetProjectLoader);
    projectLoaderService = container.resolve(ProjectLoaderServiceImpl);

    baseDir = await container.get(ProviderTypes.BaseDirProvider).get();

    [csprojPath] = addCsproj('Project1', '/', { dependencies: ['Dependency1'] });
    [dependencyCsprojPath] = addCsproj('Dependency1', '/');
    [testCsprojPath] = addCsproj('Project1.Tests', '/', { dependencies: ['Project1'], testProject: true });
  });

  test('should be registered in the container', () => {
    const registeredHandler = container.getAll(PluginTypes.ProjectLoader).find(h => h.pluginIdentifier === DotnetPlugin.pluginIdentifier);
    expect(registeredHandler).toBeInstanceOf(DotnetProjectLoader);
  });

  describe(DotnetProjectLoader.prototype.loadProject, () => {
    test('should successfully load file', async () => {
      // When
      const result = await loader.loadProject(csprojPath);

      // Verify
      expect(result).not.toBeUndefined();
      expect(result.name).toBe(basename(csprojPath, '.csproj'));
      expect(result.dependencies).toMatchObject(['../Dependency1']);
      expect(result.tags).toContain('plugin:dotnet');
    });

    test('should include base commands', async () => {
      // When
      const result = await loader.loadProject(csprojPath);

      // Verify
      expect(result.commands.restore).toMatchObject({
        command: 'dotnet restore ${{env.DOTNET_RESTORE_ARGS || ""}}',
      });
      expect(result.commands.build).toMatchObject({
        command: 'dotnet build -c ${{env.DOTNET_CONFIGURATION || "Release"}} ${{env.DOTNET_BUILD_ARGS || ""}}',
      });
      expect(result.commands.publish).toMatchObject({
        command: 'dotnet publish -c ${{env.DOTNET_CONFIGURATION || "Release"}} ${{env.DOTNET_BUILD_ARGS || ""}} ${{env.DOTNET_PUBLISH_ARGS || ""}}',
      });
      expect(result.commands.package).toMatchObject({
        command: 'dotnet pack -c ${{env.DOTNET_CONFIGURATION || "Release"}} ${{env.DOTNET_BUILD_ARGS || ""}} ${{env.DOTNET_PACK_ARGS || ""}}',
      });
      expect(result.commands.test).toBe(undefined);
    });

    test('when project is a test project, should include test command without pack', async () => {
      // Given
      const [projectPath] = addCsproj('TestProject', '/', { testProject: true });

      // When
      const result = await loader.loadProject(projectPath);

      // Verify
      expect(result.commands.test).toMatchObject({
        command: 'dotnet test -c ${{env.DOTNET_CONFIGURATION || "Release"}} ${{env.DOTNET_BUILD_ARGS || ""}} ${{env.DOTNET_TEST_ARGS || ""}}',
      });
      expect(result.commands.package).toBe(undefined);
    });

    test('when IsPackable = false, should not include pack command', async () => {
      // Given
      const [projectPath] = addCsproj('NotPackable', '/', {
        properties: {
          IsPackable: 'false'
        }
      });

      // When
      const result = await loader.loadProject(projectPath);

      // Verify
      expect(result.commands.package).toBe(undefined);
    });

    test('when loading multiple dependencies should successfully load files', async () => {
      // When
      const dependencyResult = await loader.loadProject(dependencyCsprojPath);
      const mainResult = await loader.loadProject(csprojPath);

      // Verify
      expect(dependencyResult).not.toBeUndefined();
      expect(dependencyResult.name).toBe(basename(dependencyCsprojPath, '.csproj'));
      expect(dependencyResult.dependencies).toMatchObject([]);
      expect(dependencyResult.tags).toContain('plugin:dotnet');

      expect(mainResult).not.toBeUndefined();
      expect(mainResult.name).toBe(basename(csprojPath, '.csproj'));
      expect(mainResult.dependencies).toMatchObject(['../Dependency1']);
      expect(mainResult.tags).toContain('plugin:dotnet');
    });

    test('when Directory.Build.props exists, should include as dependency', async () => {
      // Given
      fs.writeFileSync(join(baseDir, '/Directory.Build.props'), '<Project />');

      // When
      const result = await loader.loadProject(csprojPath);

      // Verify
      expect(result.dependencies).toContain('/Directory.Build.props');
    });

    test('when test project is loaded, should include test command', async () => {
      // When
      const result = await loader.loadProject(testCsprojPath);

      // Verify
      expect(result.commands.test).toMatchObject({ command: 'dotnet test -c ${{env.DOTNET_CONFIGURATION || "Release"}} ${{env.DOTNET_BUILD_ARGS || ""}} ${{env.DOTNET_TEST_ARGS || ""}}' });
    });

    test('should successfully load file via projectLoader', async () => {
      // Given
      await writeFile(join(baseDir, 'Directory.Build.props'), '<Project />');

      // When
      const results = await projectLoaderService.loadProjects();

      // Verify
      expect(results).toHaveLength(3);
      results.sort((a, b) => a.name.localeCompare(b.name));

      for (const result of results) {
        // all projects should match these
        expect(result.tags).toContain('plugin:dotnet');
      }

      const [dependency, project, tests] = results;
      expect(dependency.name).toBe('Dependency1');
      expect(dependency.dependencies).toMatchObject(['/Directory.Build.props']);
      expect(project.name).toBe('Project1');
      expect(project.dependencies).toMatchObject(['/Dependency1', '/Directory.Build.props']);
      expect(tests.name).toBe('Project1.Tests');
      expect(tests.dependencies).toMatchObject(['/Dependency1', '/Directory.Build.props', '/Project1']);
    });
  });
});
