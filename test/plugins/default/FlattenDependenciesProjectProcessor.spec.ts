import { Container } from 'inversify';
import 'reflect-metadata';
import { FlattenDependenciesProjectProcessor } from '../../../src/plugins/default/FlattenDependenciesProjectProcessor';
import { createContainer } from '../../mocks';
import { projectExamples } from '../../project-examples';

describe(FlattenDependenciesProjectProcessor, () => {
  let container: Container;
  let processor: FlattenDependenciesProjectProcessor;

  beforeEach(() => {
    container = createContainer();
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
  });
});
