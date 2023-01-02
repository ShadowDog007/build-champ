jest.mock('fs');
jest.mock('fs/promises');

import { writeFile } from 'fs/promises';
import { TemplateCommand } from '../../src/cli/TemplateCommand';
import { TYPES } from '../../src/TYPES';
import { createContainer, MockProjectService, resetFs } from '../mocks';
import { projectExamples } from '../project-examples';
import { CommandTestHelper } from './CommandTestHelper';

describe(TemplateCommand, () => {
  let command: TemplateCommand;
  let projectService: MockProjectService;

  let testHelper: CommandTestHelper;

  beforeEach(async () => {
    await resetFs();
    const container = createContainer();

    container.rebind(TYPES.ProjectService).to(MockProjectService).inSingletonScope();

    projectService = container.get(TYPES.ProjectService);
    projectService.addProjects(...Object.values(projectExamples));

    command = container.resolve(TemplateCommand);
    testHelper = new CommandTestHelper(command.command);
  });

  describe('.parseAsync', () => {
    test('when two templates provided, should exit with code 31',
      () => testHelper.testParseError(['-f', '/test.txt', '-t', '${{1+1}}'], 31, 'Must only provide one of --template-file or --template')
    );

    test('when no template provided, should exit with code 32',
      () => testHelper.testParseError([], 32, 'Must provide either --template-file or --template')
    );

    test('when template provided, should output template',
      () => testHelper.testParse(['-t', '`${{projects.Project1.version.hash}}`'], [`\`${projectExamples.project1.version.hash}\``])
    );

    test('when template file provided, should output template', async () => {
      const template = JSON.stringify({
        project1Version: '${{projects.project1.version.hash}}',
        project2Version: '${{projects.project2.version.hash}}',
      }, undefined, 2);
      await writeFile('/template.txt', template);

      await testHelper.testParse(['-f', '/template.txt'], [
        '{',
        `  "project1Version": "${projectExamples.project1.version.hash}",`,
        `  "project2Version": "${projectExamples.project2.version.hash}"`,
        '}',
      ]);
    });

  });
});
