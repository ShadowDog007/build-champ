import { Container } from 'inversify';
import 'reflect-metadata';
import { FlattenDependencies } from '../../../src/projects/processors/FlattenDependencies';
import { Project } from '../../../src/projects/Project';
import { createContainer } from '../../mocks';
import { projectExamples } from '../../project-examples';

describe('FlattenDependencies', () => {
  let container: Container;
  let processor: FlattenDependencies;

  beforeEach(() => {
    container = createContainer();
    processor = container.resolve(FlattenDependencies);
  });

  async function* createGenerator(...projects: Project[]) {
    yield* projects;
  }

  describe('.processProejcts', () => {
    test('should flatten dependencies', async () => {
      // Given
      const inputProjects = createGenerator(
        {
          ...projectExamples.project1,
          dependencies: ['a'],
        },
        {
          ...projectExamples.project2,
          dir: 'a',
          dependencies: ['b'],
        },
      );

      const projects: Project[] = [];
      // When
      for await (const project of processor.processProjects(inputProjects)) {
        projects.push(project);
      }

      // Verify
      expect(projects[0].dependencies).toMatchObject(['a', 'b']);
    });

    test('should flatten nested dependencies', async () => {
      // Given
      const inputProjects = createGenerator(
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
        },
      );

      const projects: Project[] = [];
      // When
      for await (const project of processor.processProjects(inputProjects)) {
        projects.push(project);
      }

      // Verify
      expect(projects[0].dependencies).toMatchObject(['a', 'b', 'c']);
    });
  });
});
