jest.mock('fs');
jest.mock('fs/promises');

import { mkdir, readFile, writeFile } from 'fs/promises';
import { Container, injectable } from 'inversify';
import 'reflect-metadata';
import { ProjectMetadataLoader } from '../../../src/projects/metadata';
import { LoadProjectMetadata } from '../../../src/projects/processors/LoadProjectMetadata';
import { Project } from '../../../src/projects/Project';
import { TYPES } from '../../../src/TYPES';
import { createContainer, MockBaseDirProvider, resetFs } from '../../mocks';
import { projectExamples } from '../../project-examples';

@injectable()
export class MockProjectMetadataLoader implements ProjectMetadataLoader {
  extensionPattern = '.metadata.json';
  loadMetadata: ProjectMetadataLoader['loadMetadata'] = async (filePath) => JSON.parse(await readFile(filePath, { encoding: 'utf8' }));
}

async function addMetadata(project: string, meta: Partial<Omit<Project, 'dir'>>) {
  await mkdir(`/${project}`);
  await writeFile(`/${project}/.metadata.json`, JSON.stringify(meta));
}

describe('ResolveDependencies', () => {
  let container: Container;
  let processor: LoadProjectMetadata;

  beforeEach(async () => {
    await resetFs();
    container = createContainer();

    container.rebind(TYPES.BaseDirProvider).to(MockBaseDirProvider);
    container.unbind(TYPES.ProjectMetadataHandler);
    container.bind(TYPES.ProjectMetadataHandler).to(MockProjectMetadataLoader).inSingletonScope();

    processor = container.resolve(LoadProjectMetadata);
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

  test('should load dependencies correctly', async () => {
    // Given
    await addMetadata('project1', {
      dependencies: ['project2'],
    });
    await addMetadata('project2', {
      dependencies: ['project4'],
    });

    const generator = createGenerator({
      ...projectExamples.project1,
      dir: 'project1',
      dependencies: [],
    }, {
      ...projectExamples.project2,
      dir: 'project2',
      dependencies: ['project3'],
    });

    // When
    const projectDependencies: string[][] = [];
    for await (const project of processor.processProjects(generator)) {
      projectDependencies.push(project.dependencies);
    }

    // Verify
    expect(projectDependencies)
      .toMatchObject([['project2'], ['project3', 'project4']]);
  });

  test('should load tags correctly', async () => {
    // Given
    await addMetadata('project1', {
      tags: ['project-type:dotnet']
    });
    await addMetadata('project2', {
      tags: ['project-type:node']
    });

    const generator = createGenerator({
      ...projectExamples.project1,
      dir: 'project1',
      tags: [],
    }, {
      ...projectExamples.project2,
      dir: 'project2',
      tags: ['test']
    });

    // When
    const projectTags: string[][] = [];
    for await (const project of processor.processProjects(generator)) {
      projectTags.push(project.tags);
    }

    // Verify
    expect(projectTags)
      .toMatchObject([['project-type:dotnet'], ['project-type:node', 'test']]);
  });
});

async function* createGenerator(...projects: Project[]) {
  yield* projects;
}
