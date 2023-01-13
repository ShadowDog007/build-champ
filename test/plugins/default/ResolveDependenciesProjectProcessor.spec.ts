import { Container } from 'inversify';
import 'reflect-metadata';
import { ResolveDependencies as ResolveDependenciesProjectProcessor } from '../../../src/plugins/default/ResolveDependenciesProjectProcessor';
import { createContainer } from '../../mocks';
import { projectExamples } from '../../project-examples';

describe(ResolveDependenciesProjectProcessor, () => {
  let container: Container;
  let processor: ResolveDependenciesProjectProcessor;

  beforeEach(async () => {
    container = await createContainer();

    processor = container.resolve(ResolveDependenciesProjectProcessor);
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
