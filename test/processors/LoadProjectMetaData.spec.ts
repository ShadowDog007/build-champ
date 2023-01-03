jest.mock('fs');
jest.mock('fs/promises');

import { mkdir, readFile, writeFile } from 'fs/promises';
import { Container, injectable } from 'inversify';
import 'reflect-metadata';
import { ProjectMetadataLoader } from '../../src/metadata';
import { Project } from '../../src/models/Project';
import { LoadProjectMetadata } from '../../src/processors/LoadProjectMetadata';
import { TYPES } from '../../src/TYPES';
import { createContainer, resetFs } from '../mocks';
import { projectExamples } from '../project-examples';
import { testProcessor } from './testProcessor';

@injectable()
export class MockProjectMetadataLoader implements ProjectMetadataLoader {
  extensionPattern = '.metadata.json';
  loadMetadata: ProjectMetadataLoader['loadMetadata'] = async (filePath) => JSON.parse(await readFile(filePath, { encoding: 'utf8' }));
}

async function addMetadata(project: string, meta: Partial<Omit<Project, 'dir'>>) {
  await mkdir(`/${project}`);
  await writeFile(`/${project}/.metadata.json`, JSON.stringify(meta));
}

describe(LoadProjectMetadata, () => {
  let container: Container;
  let processor: LoadProjectMetadata;

  beforeEach(async () => {
    await resetFs();
    container = createContainer();

    container.unbind(TYPES.ProjectMetadataHandler);
    container.bind(TYPES.ProjectMetadataHandler).to(MockProjectMetadataLoader).inSingletonScope();

    processor = container.resolve(LoadProjectMetadata);
  });

  test('should return all projects', async () => {
    // When
    const projectNames = (await testProcessor(processor, projectExamples.project1, projectExamples.project2))
      .map(p => p.name);

    // Verify
    expect(projectNames).toMatchObject([projectExamples.project1.name, projectExamples.project2.name]);
  });

  test('should load dependencies correctly', async () => {
    // Given
    await addMetadata('project1', {
      dependencies: ['../project2'],
    });
    await addMetadata('project2', {
      dependencies: ['../project4'],
    });

    // When
    const projectDependencies = (await testProcessor(processor,
      {
        ...projectExamples.project1,
        dir: '/project1',
        dependencies: [],
      }, {
      ...projectExamples.project2,
      dir: '/project2',
      dependencies: ['../project3'],
    }))
      .map(p => p.dependencies);

    // Verify
    expect(projectDependencies)
      .toMatchObject([['../project2'], ['../project3', '../project4']]);
  });

  test('should load tags correctly', async () => {
    // Given
    await addMetadata('project1', {
      tags: ['project-type:dotnet']
    });
    await addMetadata('project2', {
      tags: ['project-type:node']
    });

    // When
    const projectTags = (await testProcessor(processor, {
      ...projectExamples.project1,
      dir: '/project1',
      tags: [],
    }, {
      ...projectExamples.project2,
      dir: '/project2',
      tags: ['test']
    }))
      .map(p => p.tags);

    // Verify
    expect(projectTags)
      .toMatchObject([['project-type:dotnet'], ['project-type:node', 'test']]);
  });
});
