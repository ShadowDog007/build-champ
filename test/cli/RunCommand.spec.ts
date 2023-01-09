jest.mock('fs');
jest.mock('fs/promises');

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { cwd } from 'process';
import { RunCommand } from '../../src/cli/RunCommand';
import { ProjectService } from '../../src/services/ProjectService';
import { SpawnService } from '../../src/services/SpawnService';
import { TYPES } from '../../src/TYPES';
import { createContainer, MockProjectService, MockProvider, MockSpawnService, resetFs } from '../mocks';
import { projectExamples } from '../project-examples';
import { CommandTestHelper } from './CommandTestHelper';

describe('RunCommand', () => {
  let command: RunCommand;
  let testHelper: CommandTestHelper;

  let baseDirProvider: MockProvider<string>;
  let projectService: MockProjectService;

  beforeEach(async () => {
    await resetFs();
    const container = createContainer();

    container.rebind<ProjectService>(TYPES.ProjectService).to(MockProjectService).inSingletonScope();
    container.rebind<SpawnService>(TYPES.SpawnService).to(MockSpawnService);

    command = container.resolve(RunCommand);
    testHelper = new CommandTestHelper(command.command);
    baseDirProvider = container.get(TYPES.BaseDirProvider as symbol);
    projectService = container.get(TYPES.ProjectService);

    projectService.addProjects(...Object.values(projectExamples));
  });


  describe('.parseAsync(args: string[])', () => {
    test('when no base dir, should exit with code 2',
      async () => {
        baseDirProvider.value = Promise.reject(new Error());
        return testHelper.testParseError(['dummy'], 2, `Couldn't find git repository containing ${cwd()}`);
      }
    );

    describe('when running command with dependency', () => {
      test('should run in dependency order',
        () => testHelper.testParse(['test'], [
          '[Project2] running: `echo running`',
          '[Project2] running',
          '[Project2] success: `echo running`',
          '[Project1] running: `echo running`',
          '[Project1] running',
          '[Project1] success: `echo running`'
        ]));

      test('and concurrency should run in dependency order',
        () => testHelper.testParse(['test', '--concurrency=2'], [
          '[Project2] running: `echo running`',
          '[Project2] running',
          '[Project2] success: `echo running`',
          '[Project1] running: `echo running`',
          '[Project1] running',
          '[Project1] success: `echo running`'
        ]));

      test('ignoring order should run in dir order',
        () => testHelper.testParse(['test', '--ignore-dependencies'], [
          '[Project1] running: `echo running`',
          '[Project1] running',
          '[Project1] success: `echo running`',
          '[Project2] running: `echo running`',
          '[Project2] running',
          '[Project2] success: `echo running`'
        ]));
    });

    test('when running command defined in one project should run as expected',
      () => testHelper.testParse(['project1'], [
        '[Project1] running: `echo running`',
        '[Project1] running',
        '[Project1] success: `echo running`'
      ]));

    test('when running command with stderr output should capture output',
      () => testHelper.testParse(['logError'], [
        '[Project1] running: `echo error>&2`',
        '[Project1] error',
        '[Project1] success: `echo error>&2`'
      ]));

    describe('when running command with template expression', () => {
      test('when running command with template expression should execute replacement',
        () => testHelper.testParse(['contextCommand', '-c', 'echo=This is from the context'], [
          '[Project1] running: `echo ${{context.echo}}`',
          '[Project1] This is from the context',
          '[Project1] success: `echo ${{context.echo}}`',
        ])
      );

      test('when running command with template expression should execute replacement',
        () => testHelper.testParse(['contextCommandArg', '-c', 'echo=This is from the context'], [
          '[Project1] running: `echo "${{context.echo}}"`',
          '[Project1] This is from the context',
          '[Project1] success: `echo "${{context.echo}}"`',
        ])
      );

      test('which is project scoped should execute replacement',
        () => testHelper.testParse(['contextCommandProjectScoped'], [
          '[Project1] running: `echo ${{name}}`',
          '[Project1] Project1',
          '[Project1] success: `echo ${{name}}`',
        ])
      );
    });

    describe('when running failing command', () => {
      test('should exit with code 22',
        () => testHelper.testParseError(['fail'], 22, 'Command `fail` failed'));

      test('with failureCondition = \'skip\', should skip command',
        () => testHelper.testParse(['failSkip'], [
          '[Project1] running: `exit 42`',
          '[Project1] skipped: `exit 42` failed with code 42',
        ]));

      test('should cancel parallel commands', () => {
        return testHelper.testParse(['failParallel', '--concurrency=2'], [
          '[Project1] running: `exit 1`',
          '[Project3] running: `sleep 1`',
          '[Project1] failed: `exit 1` failed with code 1',
          '[Project3] failed: `sleep 1` AbortError: The operation was aborted',
          'Command `failParallel` failed',
        ], { ignoreErrors: true });
      });
    });

    describe('when running command with contition', () => {
      test('that fails should skip command',
        () => testHelper.testParse(['skipCondition'], [
          '[Project1] skipped: Condition `1 === 2` evaluated to false',
        ])
      );

      test('that fails and fail behaviour ignoring failures should fail project command without error',
        () => testHelper.testParse(['failCondition', '--continue-on-failure'], [
          '[Project1] failed: Condition `1 === 2` evaluated to false',
        ])
      );

      test('using context parameter to pass should run command',
        () => testHelper.testParse(['contextCondition', '--context', 'val=1'], [
          '[Project1] running: `echo running`',
          '[Project1] running',
          '[Project1] success: `echo running`',
        ])
      );
      test('using context parameter to skip should skip command',
        () => testHelper.testParse(['contextCondition', '--context', 'val=2'], [
          '[Project1] skipped: Condition `1 == context.val` evaluated to false',
        ])
      );
      test('using project scoped expression to pass should run command',
        () => testHelper.testParse(['contextProjectScopedCondition'], [
          '[Project1] running: `echo running`',
          '[Project1] running',
          '[Project1] success: `echo running`',
        ])
      );

      test('is malformed, should skip command',
        () => testHelper.testParse(['malformedCondition'], [
          '[Project1] skipped: Condition `1 = 2` failed to evaluate \'SyntaxError: Invalid left-hand side in assignment\'',
        ])
      );
    });

    test('when .env file exists, should add environment variable', async () => {
      // Given
      const projectDir = join('/', projectExamples.project1.dir);
      await mkdir(projectDir, { recursive: true });
      await writeFile(join(projectDir, '.env'), 'DOTENV_VAR=from-dot-env');

      // When/Verify
      await testHelper.testParse(['dotEnvCommand'], [
        '[Project1] running: echo $DOTENV_VAR',
        '[Project1] from-dot-env',
        '[Project1] success: echo $DOTENV_VAR'
      ]);
    });

    test('when multiple .env file exists, should use value from closest scope', async () => {
      // Given
      const projectDir = join('/', projectExamples.project1.dir);
      await mkdir(projectDir, { recursive: true });
      await writeFile('/.env', 'DOTENV_VAR=parentScope');
      await writeFile('/src/.env', 'DOTENV_VAR=from-dot-env');

      // When/Verify
      await testHelper.testParse(['dotEnvCommand'], [
        '[Project1] running: echo $DOTENV_VAR',
        '[Project1] from-dot-env',
        '[Project1] success: echo $DOTENV_VAR'
      ]);
    });

    test('when unknown command provided should exit with code 21',
      () => testHelper.testParseError(['unknown'], 21, 'No matching projects define command `unknown`'));
  });
});
