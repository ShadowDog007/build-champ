import { Container } from 'inversify';
import 'reflect-metadata';
import { ResolveDependencies } from '../../../src/projects/processors/ResolveDependencies';
import { Project } from '../../../src/projects/Project';
import { TYPES } from '../../../src/TYPES';
import { BaseDirProvider } from '../../../src/util/BaseDirProvider';
import { createContainer, MockBaseDirProvider } from '../../mocks';
import { projectExamples } from '../../project-examples';

describe('ResolveDependencies', () => {
  let container: Container;
  let processor: ResolveDependencies;

  beforeEach(() => {
    container = createContainer();

    container.rebind<BaseDirProvider>(TYPES.BaseDirProvider).to(MockBaseDirProvider);

    processor = container.resolve(ResolveDependencies);
  });

  test('should return all projects', async () => {
    // Given
    const generator = createGenerator(projectExamples.project1, projectExamples.project2);

    // When
    const projectNames: string[] = [];
    for await (const project of processor.processProjects(generator)) {
      projectNames.push(project.name);
    }

    // Verify
    expect(projectNames).toMatchObject([projectExamples.project1.name, projectExamples.project2.name]);
  });

  test('should resolve dependencies relative to base dir', async () => {
    // Given
    const generator = createGenerator({
      ...projectExamples.project1,
      dir: 'project1',
      dependencies: ['../project2'],
    }, {
      ...projectExamples.project2,
      dir: 'project2',
      dependencies: ['../project3'],
    });

    // When
    const projectDependencies: string[][] = [];
    for await (const project of processor.processProjects(generator)) {
      projectDependencies.push(project.dependencies);
    }

    // Verify
    expect(projectDependencies)
      .toMatchObject([['project2'], ['project3']]);
  });
});

async function* createGenerator(...projects: Project[]) {
  yield* projects;
}
