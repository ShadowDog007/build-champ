jest.mock('chalk');

import { Container } from 'inversify';
import 'reflect-metadata';
import { FlattenDependenciesProjectProcessor } from '../../../src/plugins/default/FlattenDependenciesProjectProcessor';
import { createContainer } from '../../mocks';
import { projectExamples } from '../../project-examples';
import { Project } from '../../../src/models/Project';
import { BuildChampError } from '../../../src/util/BuildChampError';

describe(FlattenDependenciesProjectProcessor, () => {
  let container: Container;
  let processor: FlattenDependenciesProjectProcessor;

  beforeEach(async () => {
    container = await createContainer();
    processor = container.resolve(FlattenDependenciesProjectProcessor);
  });

  describe('.processProejcts', () => {
    test('should flatten dependencies', async () => {
      // When
      const projects = await processor.processBatch([
        {
          ...projectExamples.project1,
          dependencies: ['a'],
        },
        {
          ...projectExamples.project2,
          dir: 'a',
          dependencies: ['b'],
        }
      ]);

      // Verify
      expect(projects[0].dependencies).toMatchObject(['a', 'b']);
    });

    test('should flatten nested dependencies', async () => {
      // When
      const projects = await processor.processBatch([
        {
          ...projectExamples.project1,
          dependencies: ['a'],
        },
        {
          ...projectExamples.project3,
          dir: 'b',
          dependencies: ['c']
        },
        {
          ...projectExamples.project2,
          dir: 'a',
          dependencies: ['b'],
        }
      ]);

      // Verify
      expect(projects[0].dependencies).toMatchObject(['a', 'b', 'c']);
    });

    test('should idenfity circular references', async () => {
      // Given
      const projects: Project[] = [{
        ...projectExamples.project1,
        dependencies: [projectExamples.project2.dir]
      }, {
        ...projectExamples.project2,
        dependencies: [projectExamples.project1.dir]
      }];

      // When/Verify
      await expect(() => processor.processBatch(projects))
        .rejects
        .toThrow(new BuildChampError('Circular reference discovered: '
          + `${projectExamples.project1.name}(${projectExamples.project1.dir})`
          + ` => ${projectExamples.project2.name}(${projectExamples.project2.dir})`));

    });
  });
});
