jest.mock('fs');
jest.mock('fs/promises');

import { mkdir, writeFile } from 'fs/promises';
import { Container } from 'inversify';
import { resolve } from 'path';
import { stringify } from 'yaml';
import { Project } from '../../src/models/Project';
import { ProjectVersion } from '../../src/models/ProjectVersion';
import { ProjectServiceImpl } from '../../src/services/ProjectService';
import { TYPES } from '../../src/TYPES';
import { createContainer, MockCommit, MockRepositoryService, resetFs } from '../mocks';

describe('ProjectService', () => {
  let container: Container;
  let projectService: ProjectServiceImpl;
  let repositoryService: MockRepositoryService;

  let project: Omit<Project, 'dir'>;

  async function defineProject(dir: string, project: Omit<Project, 'dir'>) {
    const fullDir = resolve('/', dir);
    await mkdir(fullDir, { recursive: true });
    await writeFile(resolve(fullDir, '.project.yaml'), stringify(project));
  }

  beforeEach(async () => {
    await resetFs();
    container = createContainer();

    project = {
      name: 'Project1',
      dependencies: [
        '../dependency2',
      ],
      commands: {
        test: {
          command: 'echo test'
        }
      },
      tags: [
        'platform:windows',
      ],
    };

    container.rebind(TYPES.RepositoryService).to(MockRepositoryService).inSingletonScope();

    projectService = container.get(TYPES.ProjectService);
    repositoryService = container.get(TYPES.RepositoryService);
  });

  afterEach(() => {
    container.restore();
  });

  test('should be resolvable', () => {
    expect(projectService).toBeInstanceOf(ProjectServiceImpl);
  });

  describe('.getProjects()', () => {
    test('when no projects, should return empty array', async () => {
      // When
      const projects = await projectService.getProjects();

      // Verify
      expect(projects).toMatchObject([]);
    });

    test('when project exists, should load and return project', async () => {
      // Given
      await defineProject('/src/project1', {
        ...project,
        extends: '../../.project.base.yaml'
      });
      const extension = {
        dependencies: ['./src/shared-dependency']
      } satisfies Partial<Project>;
      await writeFile('/.project.base.yaml', stringify(extension));

      // When
      const projects = await projectService.getProjects();

      // Verify
      expect(projects).toMatchObject([{
        ...project,
        dependencies: [
          'src/dependency2',
          'src/shared-dependency'
        ]
      }]);
    });

    test('when two project exists, should return projects sorted', async () => {
      // Given
      await defineProject('project1', project);
      await defineProject('project2', project);

      // When
      const projects = await projectService.getProjects();

      // Verify
      expect(projects.map(p => p.dir)).toMatchObject([
        'project1',
        'project2'
      ]);
    });
  });

  describe('.getProjectsWithVersions()', () => {
    test('when no projects, should return empty array', async () => {
      // When
      const projects = await projectService.getProjectsWithVersions();

      // Verify
      expect(projects).toMatchObject([]);
    });

    test('when project exists, should load and return project', async () => {
      // Given
      const version: ProjectVersion = {
        hash: '1234567890',
        hashShort: '12345678',
        timestamp: new Date('2022-12-23'),
      };
      const commit: MockCommit = {
        ...version,
        files: ['project1/test.txt'],
      };
      repositoryService.addCommitChanges(commit);
      await defineProject('project1', project);

      // When
      const projects = await projectService.getProjectsWithVersions();

      // Verify
      expect(projects).toMatchObject([{
        ...project,
        dependencies: [
          'dependency2',
        ],
        version,
      }]);
    });

    test('when two project exists, should return projects correct versions', async () => {
      // Given
      const latestVersion: ProjectVersion = {
        hash: '1234567890',
        hashShort: '12345678',
        timestamp: new Date('2022-12-23'),
      };
      const middleVersion: ProjectVersion = {
        hash: '1111111111',
        hashShort: '11111111',
        timestamp: new Date('2022-11-05'),
      };
      const earlierVersion: ProjectVersion = {
        hash: '0000000000',
        hashShort: '00000000',
        timestamp: new Date('2022-11-01'),
      };
      repositoryService.addCommitChanges({ ...latestVersion, files: ['project1/test.txt'] });
      repositoryService.addCommitChanges({ ...middleVersion, files: ['dependency2/file.json'] });
      repositoryService.addCommitChanges({
        ...earlierVersion,
        files: [
          'project1/test.txt',
          'project2/foo.bar.json'
        ]
      });
      await defineProject('project1', project);
      await defineProject('project2', project);

      // When
      const projects = await projectService.getProjectsWithVersions();

      // Verify
      expect(projects.find(p => p.dir === 'project1')?.version).toMatchObject(latestVersion);
      expect(projects.find(p => p.dir === 'project2')?.version).toMatchObject(middleVersion);
    });
  });
});
