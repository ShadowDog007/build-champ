jest.mock('fs');
jest.mock('fs/promises');

import { writeFile } from 'fs/promises';
import { Container } from 'inversify';
import { sep } from 'path';
import { stringify } from 'yaml';
import { ProjectExtension } from '../../../src/projects/processors/ProjectExtension';
import { Project } from '../../../src/projects/Project';
import { TYPES } from '../../../src/TYPES';
import { createContainer, resetFs } from '../../mocks';
import { createDefaultProject, testProcessor } from './testProcessor';

describe(ProjectExtension, () => {
  let processor: ProjectExtension;
  let container: Container;

  beforeEach(async () => {
    await resetFs();

    container = createContainer();
    processor = container.resolve(ProjectExtension);
  });

  test('should be resolved first in container', () => {
    // When
    const processors = container.getAll(TYPES.ProjectProcessor);

    // Verify
    expect(processors.at(0)).toBeInstanceOf(ProjectExtension);
  });

  test('when empty project extends base should load all properties from base', async () => {
    // Given
    const base = {
      name: 'Base',
      dependencies: ['./test'],
      tags: ['project-type:base'],
      commands: {
        base: {
          command: 'echo from-base'
        }
      }
    } satisfies Omit<Project, 'extends' | 'dir'>;

    await writeFile('/.project.base.yaml', stringify(base));

    const project = {
      ...createDefaultProject('/src/project1'),
      extends: '../../.project.base.yaml',
    };

    // When
    const result = await testProcessor(processor, project);

    // Verify
    expect(result.length).toBe(1);
    expect(result[0]).toMatchObject({
      dir: '/src/project1',
      ...base,
      dependencies: [`..${sep}..${sep}test`]
    });
  });

  test('when project with name extends base should keep project name', async () => {
    // Given
    const base = {
      name: 'Base',
    } satisfies Partial<Omit<Project, 'extends' | 'dir'>>;

    await writeFile('/.project.base.yaml', stringify(base));

    const project = {
      ...createDefaultProject('/src/project1'),
      extends: '../../.project.base.yaml',
      name: 'Project1',
    };

    // When
    const result = await testProcessor(processor, project);

    // Verify
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Project1');
  });

  test('when project with dependencies extends base should merge dependencies relative to project dir', async () => {
    // Given
    const base = {
      dependencies: ['src/project2']
    } satisfies Partial<Omit<Project, 'extends' | 'dir'>>;

    await writeFile('/.project.base.yaml', stringify(base));

    const project = {
      ...createDefaultProject('/src/project1'),
      extends: '../../.project.base.yaml',
      dependencies: ['../project3'],
    };

    // When
    const result = await testProcessor(processor, project);

    // Verify
    expect(result.length).toBe(1);
    expect(result[0].dependencies).toMatchObject([`..${sep}project2`, `../project3`]);
  });

  test('when project with tags extends base should merge tags', async () => {
    // Given
    const base = {
      tags: ['project-type:base']
    } satisfies Partial<Omit<Project, 'extends' | 'dir'>>;

    await writeFile('/.project.base.yaml', stringify(base));

    const project = {
      ...createDefaultProject('/src/project1'),
      extends: '../../.project.base.yaml',
      tags: ['component:api']
    };

    // When
    const result = await testProcessor(processor, project);

    // Verify
    expect(result.length).toBe(1);
    expect(result[0].tags).toMatchObject(['project-type:base', 'component:api']);
  });

  test('when project with commands extends base should merge commands', async () => {
    // Given
    const base = {
      commands: {
        base1: {
          command: 'echo base1',
        },
        base2: {
          command: 'echo base2',
        },
      }
    } satisfies Partial<Omit<Project, 'extends' | 'dir'>>;

    await writeFile('/.project.base.yaml', stringify(base));

    const project = {
      ...createDefaultProject('/src/project1'),
      extends: '../../.project.base.yaml',
      commands: {
        base2: {
          command: 'echo base2 from project'
        }
      }
    };

    // When
    const result = await testProcessor(processor, project);

    // Verify
    expect(result.length).toBe(1);
    expect(result[0].commands).toMatchObject({
      base1: base.commands.base1,
      base2: project.commands.base2,
    });
  });
});
