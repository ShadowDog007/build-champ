import { stat, writeFile } from 'fs/promises';
import { inject, injectable } from 'inversify';
import { basename, join } from 'path';
import { cwd } from 'process';
import { stringify } from 'yaml';
import { Project } from '../models/Project';
import { Provider } from '../providers';
import { TYPES } from '../TYPES';
import { BaseProjectCommand } from './BaseProjectCommand';

@injectable()
export class InitCommand extends BaseProjectCommand<[string?]> {
  constructor(
    @inject(TYPES.BaseDirProvider) private readonly baseDir: Provider<string>
  ) {
    super();

    this.command.name('init')
      .description('Initializes a directory with a default .project.yaml file')
      .argument('[projectDir]', 'Directory to initalize (default: current working directory)');
  }

  async action(projectDir?: string): Promise<void> {
    await this.checkBaseDir(this.baseDir);
    const resolvedProjectDir = projectDir ?? '.';

    const dirStat = await stat(resolvedProjectDir).catch(() => undefined);

    if (!dirStat) {
      this.error(`\`${resolvedProjectDir}\` does not exist`, { exitCode: 11 });
    } else if (!dirStat.isDirectory()) {
      this.error(`\`${resolvedProjectDir}\` is not a directory`, { exitCode: 11 });
    }

    const projectFile = join(resolvedProjectDir, '.project.yaml');

    const project: Omit<Project, 'dir'> = {
      name: basename(resolvedProjectDir === '.' ? cwd() : resolvedProjectDir),
      dependencies: [],
      tags: [],
      commands: {
        example: [
          {
            command: 'echo "example"',
          }
        ]
      },
    };

    const yaml = stringify(project);

    this.log(`Writing to \`${projectFile}\``);
    this.log(yaml);

    await writeFile(projectFile, yaml, { encoding: 'utf8' });
  }
}
