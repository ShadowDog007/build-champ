jest.mock('fs');
jest.mock('fs/promises');

import { mkdir, writeFile } from 'fs/promises';
import { Container } from 'inversify';
import { basename } from 'path';
import 'reflect-metadata';
import { js2xml } from 'xml-js';
import { DotnetMetadataHandler, DotnetSdkProjectFile } from '../../../src/projects/metadata/DotnetMetadataHandler';
import { TYPES } from '../../../src/TYPES';
import { createContainer, resetFs } from '../../mocks';

describe('DotnetMetadataHandler', () => {
  let container: Container;
  let handler: DotnetMetadataHandler;

  let csprojPath: string;
  let dependencyCsprojPath: string;

  async function addCsproj(name: string, ...dependencies: string[]): Promise<[string, DotnetSdkProjectFile]> {
    const filePath = `/${name}/${name}.csproj`;
    const content: DotnetSdkProjectFile = {
      Project: {
        ItemGroup: [{
          ProjectReference: dependencies.map(dep => ({
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
    container = createContainer();
    handler = container.resolve(DotnetMetadataHandler);

    [csprojPath] = await addCsproj('Project1', 'Dependency1');
    [dependencyCsprojPath] = await addCsproj('Dependency1');
  });

  test('should be registered in the container', () => {
    const registeredHandler = container.getAll(TYPES.ProjectMetadataHandler).find(h => h instanceof DotnetMetadataHandler);
    expect(registeredHandler).toBeInstanceOf(DotnetMetadataHandler);
  });

  describe('.loadMetadata(filePath: string)', () => {
    test('should successfully load file', async () => {
      // When
      const result = await handler.loadMetadata(csprojPath);

      // Verify
      expect(result).not.toBeUndefined();
      expect(result.name).toBe(basename(csprojPath, '.csproj'));
      expect(result.dependencies).toMatchObject(['Dependency1']);
      expect(result.tags).toContain('project-type:dotnet');
    });

    test('when loading multiple dependencies should successfully load files', async () => {
      // When
      const dependencyResult = await handler.loadMetadata(dependencyCsprojPath);
      const mainResult = await handler.loadMetadata(csprojPath);

      // Verify
      expect(dependencyResult).not.toBeUndefined();
      expect(dependencyResult.name).toBe(basename(dependencyCsprojPath, '.csproj'));
      expect(dependencyResult.dependencies).toMatchObject([]);
      expect(dependencyResult.tags).toContain('project-type:dotnet');

      expect(mainResult).not.toBeUndefined();
      expect(mainResult.name).toBe(basename(csprojPath, '.csproj'));
      expect(mainResult.dependencies).toMatchObject(['Dependency1']);
      expect(mainResult.tags).toContain('project-type:dotnet');
    });

    test('when Directory.Build.props exists, should include as dependency', async () => {
      // Given
      await writeFile('/Directory.Build.props', 'dummy');

      // When
      const result = await handler.loadMetadata(csprojPath);

      // Verify
      expect(result.dependencies).toContain('Directory.Build.props');
    });
  });
});
