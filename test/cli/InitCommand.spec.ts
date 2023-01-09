jest.mock('fs');
jest.mock('fs/promises');

import { mkdir, readFile, writeFile } from 'fs/promises';
import { Container } from 'inversify';
import { join, sep } from 'path';
import { InitCommand } from '../../src/cli/InitCommand';
import { TYPES } from '../../src/TYPES';
import { createContainer, MockProvider, resetFs } from '../mocks';
import { CommandTestHelper } from './CommandTestHelper';

describe(InitCommand, () => {
  let container: Container;

  let command: InitCommand;
  let testHelper: CommandTestHelper;
  let baseDirProvider: MockProvider<string>;

  beforeEach(async () => {
    await resetFs();

    container = createContainer();

    command = container.resolve(InitCommand);
    testHelper = new CommandTestHelper(command.command);

    baseDirProvider = container.get(TYPES.BaseDirProvider as symbol);
  });

  test('when no base dir, should exit with code 2',
    async () => {
      baseDirProvider.value = Promise.reject(new Error());
      return testHelper.testParseError([], 2, `Couldn't find git repository containing ${process.cwd()}`);
    }
  );

  test('when project directory does not exist, should exit with code 11',
    () => testHelper.testParseError(['/src/doesNotExist'], 11, '`/src/doesNotExist` does not exist')
  );

  test('when project directory is a file, should exit with code 11',
    async () => {
      await mkdir('/src');
      await writeFile('/src/not-a-dir', '');

      await testHelper.testParseError(['/src/not-a-dir'], 11, '`/src/not-a-dir` is not a directory');
    }
  );

  test('when no project directory specified, should use cwd',
    async () => {
      // Given
      const cwd = '/src/project/cwd';
      const cwdSpy = jest.spyOn(process, 'cwd');
      cwdSpy.mockReturnValue(cwd);

      await mkdir(cwd, { recursive: true });

      const expectedYaml = [
        'name: cwd',
        'dependencies: []',
        'tags: []',
        'commands:',
        '  example:',
        '    - command: echo "example"',
      ];

      // When/Verify
      await testHelper.testParse([], [
        'Writing to `.project.yaml`',
        ...expectedYaml,
      ]);

      const yaml = await readFile(join(cwd, './.project.yaml'.replaceAll(/[/]/g, sep)), 'utf8');
      expect(yaml.split(/[\r\n]+/)).toMatchObject([...expectedYaml, '']);
    }
  );

  test('when project directory specified, should use argument',
    async () => {
      // Given
      const cwd = '/src';
      const cwdSpy = jest.spyOn(process, 'cwd');
      cwdSpy.mockReturnValue(cwd);

      const projDir = './projectDir';
      await mkdir(projDir, { recursive: true });

      const expectedYaml = [
        'name: projectDir',
        'dependencies: []',
        'tags: []',
        'commands:',
        '  example:',
        '    - command: echo "example"',
      ];

      // When/Verify
      await testHelper.testParse([projDir], [
        'Writing to `projectDir/.project.yaml`'.replaceAll(/[/]/g, sep),
        ...expectedYaml,
      ]);

      const yaml = await readFile('/src/projectDir/.project.yaml', 'utf8');
      expect(yaml.split(/[\r\n]+/)).toMatchObject([...expectedYaml, '']);
    }
  );
});
