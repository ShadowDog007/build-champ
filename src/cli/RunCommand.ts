import chalk, { Chalk } from 'chalk';
import { inject, injectable } from 'inversify';
import PQueue from 'p-queue';
import { join } from 'path';
import { Project, ProjectWithVersion } from '../models/Project';
import { ProjectCommand } from '../models/ProjectCommand';
import { ProjectCommandStatus } from '../models/ProjectCommandStatus';
import { Provider } from '../providers';
import { ContextService, ProjectContext } from '../services/ContextService';
import { EvalService } from '../services/EvalService';
import { ProjectService } from '../services/ProjectService';
import { RepositoryService } from '../services/RepositoryService';
import { SpawnService } from '../services/SpawnService';
import { TYPES } from '../TYPES';
import { StreamSplitter } from '../util/StreamSplitter';
import { BaseProjectFilterCommand, ProjectFilterOptions } from './BaseProjectFilterCommand';

export interface RunCommandOptions extends ProjectFilterOptions {
  /**
   * If set, run all commands regardless of any failures
   */
  readonly continueOnFailure: boolean;

  /**
   * If true, run commands without waiting for dependencies
   */
  readonly ignoreDependencies: boolean;

  /**
   * Number of projects to run concurrently
   * @default 1
   */
  readonly concurrency: string;

  /**
   * Disable console output colors
   */
  readonly noColor: boolean;

  /**
   * Custom context values to provide to template evaluation
   */
  readonly context: `${string}=${string}`[];
}

export const projectStatusColors: Readonly<Record<ProjectCommandStatus, Chalk>> = {
  [ProjectCommandStatus.pending]: chalk.grey,
  [ProjectCommandStatus.running]: chalk.blue,
  [ProjectCommandStatus.skipped]: chalk.yellow,
  [ProjectCommandStatus.failed]: chalk.red,
  [ProjectCommandStatus.success]: chalk.green,
};

@injectable()
export class RunCommand extends BaseProjectFilterCommand<[string, RunCommandOptions]> {
  constructor(
    @inject(TYPES.ProjectService) projectService: ProjectService,
    @inject(TYPES.RepositoryService) repositoryService: RepositoryService,
    @inject(TYPES.BaseDirProvider) public baseDir: Provider<string>,
    @inject(TYPES.ContextService) private readonly contextService: ContextService,
    @inject(TYPES.EvalService) private readonly evalService: EvalService,
    @inject(TYPES.SpawnService) private readonly spawnService: SpawnService,
  ) {
    super(projectService, repositoryService);

    this.command
      .name('run')
      .description('Runs the specified command on all matching projects')
      .argument('<command>', 'The name of the command to run')
      .option('--continue-on-failure', 'If set, all project commands will be run regardless of failures')
      .option('--ignore-dependencies', 'Run commands without waiting for dependencies')
      .option('--concurrency <concurrency>', 'Number of projects to run concurrently', '1')
      .option('--no-color', 'Disable colored console output')
      .option('-c, --context <contextValues...>', 'Context values to include for template evaluations passed as `-c key=value`, use in templates as `${{context.key}}');
  }

  async action(command: string, options: RunCommandOptions): Promise<void> {
    await this.checkBaseDir(this.baseDir);

    const abortController = new AbortController();
    const projects = await this.listProjects(options);
    const projectsToRun = projects.filter(p => p.commands[command]);

    if (!projectsToRun.length) {
      this.error(`No matching projects define command \`${command}\``, { exitCode: 21 });
    }

    this.contextService.parseContextParameters(options.context);
    for (const project of projects) {
      this.contextService.setProjectStatus(
        project,
        projectsToRun.includes(project) ? ProjectCommandStatus.pending : ProjectCommandStatus.skipped
      );
    }

    const queue = new PQueue({ concurrency: parseInt(options.concurrency) });

    while (projectsToRun.length) {
      const nextProject = options.ignoreDependencies
        ? projectsToRun.shift()
        : this.shiftNextReadyToRunProject(projects, projectsToRun);

      if (!nextProject) {
        // No more projects ready to queue
        // Wait for the next project to complete, then try again
        await new Promise(resolve => queue.once('next', resolve));
        continue;
      }

      queue.add(async () => {
        this.contextService.setProjectStatus(nextProject, ProjectCommandStatus.running);
        return this.executeProjectCommandPipeline(nextProject, command, options.continueOnFailure ? undefined : abortController)
          .catch((err) => this.projectError(nextProject, `${err}`));
      }, { signal: abortController.signal });
    }

    await queue.onIdle();

    if (abortController.signal.aborted) {
      this.error(`Command \`${command}\` failed`, { exitCode: 22 });
    }
  }

  isProjectSettled(project: Project) {
    const incompleteStatuses = [ProjectCommandStatus.pending, ProjectCommandStatus.running];
    return !incompleteStatuses.includes(this.contextService.getProjectStatus(project));
  }

  shiftNextReadyToRunProject(projects: ProjectWithVersion[], projectsToRun: ProjectWithVersion[]): ProjectWithVersion | undefined {
    const incompleteProjects = projects.filter(p => !this.isProjectSettled(p));
    const projectIndex = projectsToRun.findIndex(p => !incompleteProjects.some(d => p !== d && p.dependencies.includes(d.dir)));

    return projectIndex !== -1
      ? projectsToRun.splice(projectIndex, 1)[0]
      : undefined;
  }

  updateProjectStatus(project: Project, status: ProjectCommandStatus, reason: string) {
    this.contextService.setProjectStatus(project, status);

    const statusColor = projectStatusColors[status];
    this.projectLog(project, `${statusColor(status)}: ${reason}`);
  }

  projectLog(project: Project, message: string): void {
    const statusColor = projectStatusColors[this.contextService.getProjectStatus(project)];

    this.log(`[${statusColor(project.name)}] ${message}`);
  }

  projectError(project: Project, message: string) {
    const statusColor = projectStatusColors[this.contextService.getProjectStatus(project)];

    this.error(`[${statusColor(project.name)}] ${message}`);
  }

  async executeProjectCommandPipeline(project: ProjectWithVersion, command: string, abortController?: AbortController) {
    const pipeline = [project.commands[command]].flat();

    const evalContext = await this.contextService.getProjectContext(project, command);

    for (const next of pipeline) {
      if (!this.checkCommandCondition(project, next, evalContext, abortController)
        || !await this.executeProjectCommand(project, next, evalContext, abortController)) {
        return;
      }
    }
  }

  checkCommandCondition(project: Project, projectCommand: ProjectCommand, context: ProjectContext, abortController?: AbortController) {
    if (!projectCommand.condition) {
      return true;
    }

    let result: boolean;
    let reason = 'evaluated to false';

    try {
      result = !!this.evalService.safeEval(projectCommand.condition, context);
    } catch (err) {
      result = false;
      reason = `failed to evaluate '${err}'`;
    }

    if (result) {
      return true;
    }

    const fail = projectCommand.conditionBehaviour === 'fail';
    const status = fail ? ProjectCommandStatus.failed : ProjectCommandStatus.skipped;
    this.updateProjectStatus(project, status, `Condition \`${projectCommand.condition}\` ${reason}`);
    if (fail) {
      abortController?.abort();
    }

    return false;
  }

  async executeProjectCommand(project: ProjectWithVersion, projectCommand: ProjectCommand, context: ProjectContext, abortController?: AbortController): Promise<boolean> {
    if (abortController?.signal.aborted) {
      return false;
    }

    const baseDir = await this.baseDir.get();

    return await new Promise<boolean>(resolve => {
      const commandName = projectCommand.name
        || `\`${projectCommand.command}${projectCommand.arguments?.map(a => ` "${a.replaceAll('"', '\\"')}"`).join('') ?? ''}\``;

      this.updateProjectStatus(project, ProjectCommandStatus.running, commandName);

      const command = this.evalService.safeEvalTemplate(projectCommand.command, context);
      const commandArguments = projectCommand.arguments?.map(arg => this.evalService.safeEvalTemplate(arg, context));

      const commandProcess = this.spawnService.spawn(command, commandArguments ?? [], {
        cwd: join(baseDir, project.dir),
        signal: abortController?.signal,
        stdio: 'pipe',
        shell: projectCommand.shell ?? true,
        env: context.env,
      });

      const configureOutput = (stream: typeof commandProcess.stdout, isErr: boolean) => {
        stream.setEncoding('utf8');

        stream.pipe(new StreamSplitter()).on('data', (line: string) => {
          if (isErr) {
            this.projectError(project, line);
          } else {
            this.projectLog(project, line);
          }
        });
      };

      configureOutput(commandProcess.stdout, false);
      configureOutput(commandProcess.stderr, true);

      commandProcess.on('error', err => {
        this.updateProjectStatus(project, ProjectCommandStatus.failed, `${commandName} ${err}`);
        abortController?.abort();
        resolve(false);
      });

      commandProcess.on('close', code => {
        if (abortController?.signal.aborted) {
          this.updateProjectStatus(project, ProjectCommandStatus.skipped, commandName);
        }
        if (!code) {
          this.updateProjectStatus(project, ProjectCommandStatus.success, commandName);
          resolve(true);
        } else {
          const skip = projectCommand.failureBehavior === 'skip';
          const status = skip ? ProjectCommandStatus.skipped : ProjectCommandStatus.failed;

          this.updateProjectStatus(project, status, `${commandName} failed with code ${code}`);
          if (!skip) {
            abortController?.abort();
          }
          resolve(false);
        }
      });
    });
  }
}
