jest.mock('fs');
jest.mock('fs/promises');

import { mkdir, writeFile } from 'fs/promises';
import { Container } from 'inversify';
import { basename } from 'path';
import 'reflect-metadata';
import { js2xml } from 'xml-js';
import { DotnetPlugin } from '../../../src/plugins/dotnet/DotnetPlugin';
import { DotnetProjectLoader } from '../../../src/plugins/dotnet/DotnetProjectLoader';
import { DotnetSdkProjectFile } from '../../../src/plugins/dotnet/DotnetService';
import { PluginTypes } from '../../../src/plugins/PluginTypes';
import { createContainer, resetFs } from '../../mocks';

describe(DotnetProjectLoader, () => {
  let container: Container;
  let loader: DotnetProjectLoader;

  let csprojPath: string;
  let dependencyCsprojPath: string;
  let testCsprojPath: string;

  async function addCsproj(name: string, { dependencies, testProject }: {
    dependencies?: string[],
    testProject?: boolean,
  } = {}): Promise<[string, DotnetSdkProjectFile]> {
    const filePath = `/${name}/${name}.csproj`;
    const content: DotnetSdkProjectFile = {
      Project: {
        ItemGroup: [{
          PackageReference: testProject ? [
            { _attributes: {
              Include: 'Microsoft.NET.Test.Sdk'
            }
          }] : [],
          ProjectReference: dependencies?.map(dep => ({
            _attributes: {
              Include: `../${dep}/${dep}.csproj`,
            }
          }))
        }]
      }
    };

    await mkdir(`/${name}`, { recursive: true });
    await writeFile(filePath, js2xml(content, { compact: true }));
    return [filePath, content];
  }

  beforeEach(async () => {
    await resetFs();
    container = await createContainer();
    loader = container.resolve(DotnetProjectLoader);

    [csprojPath] = await addCsproj('Project1', { dependencies: ['Dependency1'] });
    [dependencyCsprojPath] = await addCsproj('Dependency1');
    [testCsprojPath] = await addCsproj('Project1.Tests', { dependencies: ['Project1'], testProject: true });
  });

  test('should be registered in the container', () => {
    const registeredHandler = container.getAll(PluginTypes.ProjectLoader).find(h => h.pluginIdentifier === DotnetPlugin.pluginIdentifier);
    expect(registeredHandler).toBeInstanceOf(DotnetProjectLoader);
  });

  describe('.loadProject(filePath: string)', () => {
    test('should successfully load file', async () => {
      // When
      const result = await loader.loadProject(csprojPath);

      // Verify
      expect(result).not.toBeUndefined();
      expect(result.name).toBe(basename(csprojPath, '.csproj'));
      expect(result.dependencies).toMatchObject(['../Dependency1']);
      expect(result.tags).toContain('plugin:dotnet');
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
      await writeFile('/Directory.Build.props', '<Project />');

      // When
      const result = await loader.loadProject(csprojPath);

      // Verify
      expect(result.dependencies).toContain('/Directory.Build.props');
    });

    test('when test project is loaded, should include test command', async () => {
      // When
      const result = await loader.loadProject(testCsprojPath);

      // Verify
      expect(result.commands.test).toMatchObject({ command: 'dotnet', arguments: ['test'] });
    });
  });
});
