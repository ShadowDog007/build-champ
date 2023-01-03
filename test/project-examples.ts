import { platform } from 'os';
import { ProjectWithVersion } from '../src/models/Project';

export const projectExamples = {
  project1: {
    name: 'Project1',
    dir: '/src/Project1',
    dependencies: [
      '/src/Project2'
    ],
    tags: [
      'project:project1',
      'project-type:dotnet'
    ],
    commands: {
      test: {
        command: 'echo running',
      },
      project1: {
        command: 'echo running',
      },
      contextCommand: {
        command: 'echo ${{context.echo}}'
      },
      contextCommandArg: {
        command: 'echo',
        arguments: [
          '${{context.echo}}'
        ]
      },
      contextCommandProjectScoped: {
        command: 'echo ${{name}}',
      },
      fail: {
        command: 'exit 1'
      },
      failSkip: {
        command: 'exit 42',
        failureBehavior: 'skip'
      },
      failParallel: {
        command: 'exit 1'
      },
      logError: {
        command: 'echo error>&2'
      },
      skipCondition: {
        command: 'exit 1',
        condition: '1 === 2',
      },
      failCondition: {
        command: 'exit 1',
        condition: '1 === 2',
        conditionBehaviour: 'fail',
      },
      contextCondition: {
        command: 'echo running',
        condition: '1 == context.val',
      },
      contextProjectScopedCondition: {
        command: 'echo running',
        condition: 'name.startsWith("Project")',
      },
      malformedCondition: {
        command: 'exit 42',
        condition: '1 = 2'
      },
      dotEnvCommand: {
        name: 'echo $DOTENV_VAR',
        command: platform() === 'win32'
          ? 'echo %DOTENV_VAR%'
          : 'echo $DOTENV_VAR',
        shell: platform() === 'win32' ? 'cmd.exe' : true,
      }
    },
    version: {
      hash: 'a-long',
      hashShort: 'a-short',
      timestamp: new Date('2022-12-10T00:00:00.000Z'),
    },
  } satisfies ProjectWithVersion,
  project2: {
    name: 'Project2',
    dir: '/src/Project2',
    dependencies: [
      '/src/Project3'
    ],
    tags: [
      'project:project2',
      'project-type:node'
    ],
    commands: {
      test: [{
        command: 'echo running',
      }],
      project2: [{
        command: 'echo running',
      }],
    },
    version: {
      hash: 'b-long',
      hashShort: 'b-short',
      timestamp: new Date('2022-12-11T00:00:00.000Z'),
    },
  } satisfies ProjectWithVersion,
  project3: {
    name: 'Project3',
    dir: '/src/Project3',
    dependencies: [],
    tags: [
      'project:project3',
      'project-type:node'
    ],
    commands: {
      failParallel: [{
        command: 'sleep 1',
        // Sleep doesn't exit on windows default shell
        shell: process.platform === 'win32' ? 'powershell.exe' : true,
      }],
    },
    version: {
      hash: 'c-long',
      hashShort: 'c-short',
      timestamp: new Date('2022-12-11T00:00:00.000Z')
    }
  } satisfies ProjectWithVersion,
};
