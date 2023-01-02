import { FlattenDependencies } from '@/processors/FlattenDependencies';
import { Container } from 'inversify';
import 'reflect-metadata';
import { createContainer } from '../mocks';
import { projectExamples } from '../project-examples';
import { testProcessor } from './testProcessor';

describe('FlattenDependencies', () => {
  let container: Container;
  let processor: FlattenDependencies;

  beforeEach(() => {
    container = createContainer();
    processor = container.resolve(FlattenDependencies);
  });

  describe('.processProejcts', () => {
    test('should flatten dependencies', async () => {
      // When
      const projects = await testProcessor(processor,
        {
          ...projectExamples.project1,
          dependencies: ['a'],
        },
        {
          ...projectExamples.project2,
          dir: 'a',
          dependencies: ['b'],
        });

      // Verify
      expect(projects[0].dependencies).toMatchObject(['a', 'b']);
    });

    test('should flatten nested dependencies', async () => {
      // When
      const projects = await testProcessor(processor,
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
        });

      // Verify
      expect(projects[0].dependencies).toMatchObject(['a', 'b', 'c']);
    });
  });
});
