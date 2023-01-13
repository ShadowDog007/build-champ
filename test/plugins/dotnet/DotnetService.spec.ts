jest.mock('fs');
jest.mock('fs/promises');

import { Container } from 'inversify';
import { mapValues } from 'lodash';
import { join } from 'path';
import { DotnetService } from '../../../src/plugins/dotnet/DotnetService';
import { DotnetTypes } from '../../../src/plugins/dotnet/DotnetTypes';
import { ProviderTypes } from '../../../src/providers';
import { createContainer, resetFs } from '../../mocks';
import { addCsproj, saveCsproj } from './helper';

describe(DotnetService, () => {
  let container: Container;
  let service: DotnetService;
  let baseDir: string;

  beforeEach(async () => {
    await resetFs();
    container = await createContainer();

    service = container.get(DotnetTypes.DotnetService);
    baseDir = await container.get(ProviderTypes.BaseDirProvider).get();
  });

  describe(DotnetService.prototype.getProjectProperties, () => {
    test('should return properties correctly', async () => {
      // Given
      const projectPath = '/Project1/Project1.csproj';
      const properties = {
        Property1: 'hello',
        Foo: 'Bar',
      };
      saveCsproj(projectPath, {
        Project: {
          _attributes: {
            Sdk: 'Microsoft.NET.Sdk'
          },
          PropertyGroup: {
            ...mapValues(properties, v => ({ _text: v }))
          }
        }
      });

      // When
      const result = await service.getProjectProperties(projectPath);

      // Verify
      expect(result).toMatchObject(properties);
    });
  });

  describe(DotnetService.prototype.getPackageReferences, () => {
    test('when no item groups, should return no references', async () => {
      // Given
      const projectPath = '/Project1/Project1.csproj';
      saveCsproj(join(baseDir, projectPath), {
        Project: {}
      });

      // When
      const references = await service.getPackageReferences(projectPath);

      // Verify
      expect(references).toMatchObject([]);
    });
  });
});