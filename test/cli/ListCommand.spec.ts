jest.mock('fs');
jest.mock('fs/promises');

import { ListCommand } from '../../src/cli/ListCommand';
import { ProjectWithVersion } from '../../src/models/Project';
import { ProjectService } from '../../src/services/ProjectService';
import { RepositoryService } from '../../src/services/RepositoryService';
import { TYPES } from '../../src/TYPES';
import { createContainer, MockCommit, MockProjectService, MockProvider, MockRepositoryService, resetFs } from '../mocks';
import { projectExamples } from '../project-examples';
import { CommandTestHelper } from './CommandTestHelper';

describe(ListCommand, () => {
  let command: ListCommand;
  let testHelper: CommandTestHelper;

  let baseDirProvider: MockProvider<string>;
  let projectService: MockProjectService;
  let repositoryService: MockRepositoryService;

  const project1Dir = 'project1';
  const project2Dir = 'project2';
  const dependency1Dir = 'dependency1';

  const commits = {
    initial: {
      hash: 'initial commit',
      hashShort: 'initial ',
      timestamp: new Date('2022-12-20'),
      files: [project1Dir, dependency1Dir],
    },
    newProject: {
      hash: 'new project',
      hashShort: 'new proj',
      timestamp: new Date('2022-12-23'),
      files: [project2Dir],
    },
    unrelated: {
      hash: 'Updated unrelated dir',
      hashShort: 'unrelate',
      timestamp: new Date('2022-12-28'),
      files: ['README.md'],
    },
    update: {
      hash: 'Updated dependency dir',
      hashShort: 'updated ',
      timestamp: new Date('2023-01-01'),
      files: [dependency1Dir],
    }
  } satisfies Record<string, MockCommit>;

  const project1: ProjectWithVersion = {
    ...projectExamples.project1,
    dir: project1Dir,
    dependencies: [
      project2Dir,
      dependency1Dir,
    ],
    version: commits.update,
  };
  const project2: ProjectWithVersion = {
    ...projectExamples.project2,
    dir: project2Dir,
    dependencies: [],
    version: commits.newProject,
  };

  beforeEach(async () => {
    await resetFs();
    const container = await createContainer();

    container.rebind<ProjectService>(TYPES.ProjectService).to(MockProjectService).inSingletonScope();
    container.rebind<RepositoryService>(TYPES.RepositoryService).to(MockRepositoryService).inSingletonScope();

    command = container.resolve(ListCommand);
    testHelper = new CommandTestHelper(command.command);
    baseDirProvider = container.get(TYPES.BaseDirProvider as symbol);
    projectService = container.get(TYPES.ProjectService);
    repositoryService = container.get(TYPES.RepositoryService);

    projectService.addProjects(project1, project2);

    for (const commit of Object.values(commits)) {
      repositoryService.addCommitChanges(commit);
    }
  });

  describe('.parseAsync(args: string[])', () => {
    test('when no base dir, should exit with code 2',
      async () => {
        baseDirProvider.value = Promise.reject(new Error());
        return testHelper.testParseError([], 2, `Couldn't find git repository containing ${process.cwd()}`);
      }
    );

    test('when no arguments, should use default format',
      () => testHelper.testParse([], [
        `=> Project1 (${project1.version.hashShort} @ ${project1.version.timestamp.toISOString()})`,
        `=> Project2 (${project2.version.hashShort} @ ${project2.version.timestamp.toISOString()})`
      ]));
    test('when set to use long version, should use long hash',
      () => testHelper.testParse(['--long-version'], [
        `=> Project1 (${project1.version.hash} @ ${project1.version.timestamp.toISOString()})`,
        `=> Project2 (${project2.version.hash} @ ${project2.version.timestamp.toISOString()})`
      ]));

    test('when static template passed, should output using template',
      () => testHelper.testParse(['--template', 'test'], ['test', 'test']));
    test('when replacements used in template, should output correct value',
      () => testHelper.testParse(['--template', '${{name}}'], ['Project1', 'Project2']));
    test('when join character used, should output template on one line',
      () => testHelper.testParse(['--template', '${{name}}', '--join', ','], ['Project1,Project2']));

    test('when `*` name filter provided, should list all projects',
      () => testHelper.testParse(['--template', '${{name}}', '-p', '*'], ['Project1', 'Project2']));
    test('when suffix name filter provided, should list matching projects',
      () => testHelper.testParse(['--template', '${{name}}', '-p', '*2'], ['Project2']));

    test('when tag filter provided, should list matching projects',
      () => testHelper.testParse(['--template', '${{name}}', '-t', 'project:project1'], ['Project1']));

    test('when changed in provided, should list changed projects',
      () => testHelper.testParse(['--template', '${{name}}', '--changed-in', commits.initial.hash], ['Project1']));
    test('when changed in provided for dependency, should list changed projects',
      () => testHelper.testParse(['--template', '${{name}}', '--changed-in', commits.update.hash], ['Project1']));
    test('when changed in provided for dependency, should list changed projects',
      () => testHelper.testParse(['--template', '${{name}}', '--changed-in', commits.update.hash], ['Project1']));

    test('when changed in provided, and no project changes, should not list any proejcts',
      () => testHelper.testParse(['--template', '${{name}}', '--changed-in', commits.unrelated.hash], ['No matching projects']));

    test('when changed from provided, should list all project changed since',
      () => testHelper.testParse(['--template', '${{name}}', '--changed-from', commits.unrelated.hash], ['Project1']));

    test('when changed from and to provided, should list all project changed since',
      () => testHelper.testParse(['--template', '${{name}}',
        '--changed-from', commits.initial.hash,
        '--changed-to', commits.newProject.hash],
        ['Project1', 'Project2']));

    test('when verbose, should write matched count',
      () => testHelper.testParse(['-v'], [
        'Listing projects within `/`',
        'Matched 2 of 2 projects',
        `=> Project1 (${project1.version.hashShort} @ ${project1.version.timestamp.toISOString()})`,
        `=> Project2 (${project2.version.hashShort} @ ${project2.version.timestamp.toISOString()})`
      ]));
  });
});
