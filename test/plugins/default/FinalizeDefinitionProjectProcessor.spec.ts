jest.mock('fs');
jest.mock('fs/promises');

import { Container } from 'inversify';
import { Project } from '../../../src/models/Project';
import { FinalizeDefinitionProjectProcessor } from '../../../src/plugins/default/FinalizeDefinitionProjectProcessor';
import { TYPES } from '../../../src/TYPES';
import { createContainer, createDefaultProject, resetFs } from '../../mocks';

describe(FinalizeDefinitionProjectProcessor, () => {
  let processor: FinalizeDefinitionProjectProcessor;
  let container: Container;

  beforeEach(async () => {
    await resetFs();

    container = await createContainer();
    processor = container.resolve(FinalizeDefinitionProjectProcessor);
  });

  test('should be resolved last in container', () => {
    // When
    const processors = container.getAll(TYPES.ProjectProcessor);

    // Verify
    expect(processors.at(-1)).toBeInstanceOf(FinalizeDefinitionProjectProcessor);
  });

  test('should not override any project properties', async () => {
    // Given
    const project: Project = {
      extends: '../.project.base.yaml',
      name: 'ProjectApi',
      dir: '/src/project1',
      dependencies: ['dep1'],
      graph: {
        name: 'ProjectApi',
        dir: '/src/project1',
        dependencies: [],
        dependants: [],
      },
      tags: ['project-type:final'],
      commands: {
        cmd1: {
          command: 'echo running',
        }
      }
    };

    // When
    const result = await processor.process(project);

    // Verify
    expect(result).toMatchObject(project);
  });

  test('should default name to project directory name', async () => {
    // Given
    const project = createDefaultProject('/src/Project1');

    // When
    const result = await processor.process(project);

    // Verify
    expect(result.name).toBe('Project1');
  });

  test('should default name to project directory name', async () => {
    // Given
    const project = createDefaultProject('/src/Project1');

    // When
    const result = await processor.process(project);

    // Verify
    expect(result.name).toBe('Project1');
  });

  test('should remove duplicate dependencies and sort', async () => {
    // Given
    const project = {
      ...createDefaultProject('/src/Project1'),
      dependencies: ['src/zee', 'src/Project2', 'src/Project2']
    };

    // When
    const result = await processor.process(project);

    // Verify
    expect(result.dependencies).toMatchObject(['src/Project2', 'src/zee']);
  });

  test('should remove duplicate tags and sort', async () => {
    // Given
    const project = {
      ...createDefaultProject('/src/Project1'),
      tags: ['tag:dupe', 'tag:dupe', 'component:api']
    };

    // When
    const result = await processor.process(project);

    // Verify
    expect(result.tags).toMatchObject(['component:api', 'tag:dupe']);
  });
});
