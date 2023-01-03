import { Container } from 'inversify';
import 'reflect-metadata';
import { Project } from '../../src/models/Project';
import { LoadProjectMetadata } from '../../src/processors/LoadProjectMetadata';
import { ProjectExtension } from '../../src/processors/ProjectExtension';
import { ResolveDependencies } from '../../src/processors/ResolveDependencies';
import { TYPES } from '../../src/TYPES';
import { createContainer } from '../mocks';
import { projectExamples } from '../project-examples';

describe('ResolveDependencies', () => {
  let container: Container;
  let processor: ResolveDependencies;

  beforeEach(() => {
    container = createContainer();

    processor = container.resolve(ResolveDependencies);
  });

  test('should resolve after ProjectExtension and LoadProjectMetadata from container', () => {
    const processors = container.getAll(TYPES.ProjectProcessor);

    expect(processors.at(0)).toBeInstanceOf(ProjectExtension);
    expect(processors.at(1)).toBeInstanceOf(LoadProjectMetadata);
    expect(processors.at(2)).toBeInstanceOf(ResolveDependencies);
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
      dir: '/project1',
      dependencies: ['../project2'],
    }, {
      ...projectExamples.project2,
      dir: '/project2',
      dependencies: ['../project3'],
    });

    // When
    const projectDependencies: string[][] = [];
    for await (const project of processor.processProjects(generator)) {
      projectDependencies.push(project.dependencies);
    }

    // Verify
    expect(projectDependencies)
      .toMatchObject([['/project2'], ['/project3']]);
  });
});

async function* createGenerator(...projects: Project[]) {
  yield* projects;
}
