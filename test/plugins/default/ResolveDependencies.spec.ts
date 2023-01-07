import { Container } from 'inversify';
import 'reflect-metadata';
import { ResolveDependencies } from '../../../src/plugins/default/ResolveDependenciesProjectProcessor';
import { TYPES } from '../../../src/TYPES';
import { createContainer } from '../../mocks';
import { projectExamples } from '../../project-examples';

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

  test('should resolve dependencies relative to base dir', async () => {
    // Given
    const project = {
      ...projectExamples.project1,
      dir: '/project1',
      dependencies: ['../project2'],
    };

    // When
    const processed = processor.process(project);

    // Verify
    expect((await processed).dependencies)
      .toMatchObject(['/project2']);
  });
});
