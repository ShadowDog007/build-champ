import { parse } from 'dotenv';
import { readFile } from 'fs/promises';
import { inject, injectable } from 'inversify';
import minimatch from 'minimatch';
import { resolve } from 'path';
import { TYPES } from '../TYPES';
import { globAsync } from '../util/globAsync';
import { Project, ProjectWithVersion } from './Project';
import { ProjectCommandStatus } from './ProjectCommandStatus';
import { ProjectService } from './ProjectService';

export interface ContextFixed {
  readonly env: NodeJS.ProcessEnv,
  readonly os: NodeJS.Platform,
  readonly projects: Record<string, ProjectWithVersion>,
  readonly ProjectCommandStatus: typeof ProjectCommandStatus;
}

export interface ContextDynamic {
  /**
   * Current statuses of all projects
   */
  readonly status: Record<string, ProjectCommandStatus>;

  /**
   * Custom context variables
   */
  readonly context: Record<string, string>;
}

export interface Context extends ContextFixed, ContextDynamic { }
export type ProjectContext = Context & ProjectWithVersion;

export interface ContextService {
  /**
   * Gets the base context
   */
  getContext(): Promise<Context>;
  /**
   * Gets a context for the provided scopes
   * @param project Project scope
   * @param command Command scope
   */
  getProjectContext(project: ProjectWithVersion, status?: string): Promise<ProjectContext>;

  // getContext(project?: Project, command?: string): Promise<Context>;

  getProjectStatus(project: Project): ProjectCommandStatus;
  setProjectStatus(project: Project, status: ProjectCommandStatus): void;

  parseContextParameters(values: `${string}=${string}`[]): void;
}

@injectable()
export class ContextServiceImpl implements ContextService {
  private context?: ContextFixed;

  private readonly projectStatuses: Record<string, ProjectCommandStatus> = this.getCaseInsensitiveProxy({});
  private readonly contextParameters: Record<string, string> = this.getCaseInsensitiveProxy({});


  private envFiles?: string[];
  private readonly envVars: Record<string, Record<string, string>> = {};

  constructor(
    @inject(TYPES.BaseDir) private readonly baseDir: string,
    @inject(TYPES.ProjectService) private readonly projectService: ProjectService,
  ) { }

  async getContext(): Promise<Context> {
    if (!this.context) {
      this.context = await this.buildContext();
    }

    return {
      ...this.context,
      status: this.projectStatuses,
      context: this.contextParameters,
    };
  }

  async getProjectContext(project: ProjectWithVersion, command?: string): Promise<ProjectContext> {
    const context = await this.getContext();

    const envFiles = await this.getEnvFilesForProject(project, command);

    // Combine environment variables, prioritizing lower hierarchies
    const environment = await envFiles.reduce(
      (p, f) => p.then(async env => ({ ...env, ...await this.getEnvVarsFromFile(f) })),
      Promise.resolve({} as Record<string, string>)
    );

    return {
      ...context,
      env: this.getCaseInsensitiveProxy({
        ...process.env,
        ...environment
      }),
      ...project,
    };
  }

  getProjectStatus(project: Project): ProjectCommandStatus {
    return this.projectStatuses[project.name];
  }

  setProjectStatus(project: Project, status: ProjectCommandStatus) {
    this.projectStatuses[project.name] = status;
  }

  parseContextParameters(values: `${string}=${string}`[]): void {
    if (values) {
      values.map(v => v.split('=') as [string, string])
        .forEach(([k, v]) => this.contextParameters[k] = v);
    }
  }

  async getEnvFiles(): Promise<string[]> {
    if (!this.envFiles) {
      this.envFiles = await globAsync('**/.{*.env,env}', { cwd: this.baseDir, nocase: true });
      // Sort by hierarchy count
      this.envFiles.sort((a, b) => Array.from(a.matchAll(/[/\\]/g)).length - Array.from(b.matchAll(/[/\\]/g)).length);
    }

    return this.envFiles;
  }

  async getEnvFilesForProject(project: Project, command?: string): Promise<string[]> {
    const envPattern = command
      ? `{.env,.${command}.env}`
      : '.env';

    const checkDirs = Array.from(project.dir.matchAll(/[/\\]/g))
      .map(m => project.dir.slice(0, m.index))
      .concat(project.dir);

    const dirPattern = checkDirs.length > 1
      ? `{${checkDirs.join(',')}}`
      : project.dir;

    const pattern = `${dirPattern}/${envPattern}`;
    return (await this.getEnvFiles())
      .filter(f => minimatch(f, pattern, { nocase: true }));
  }

  async getEnvVarsFromFile(envFile: string) {
    if (this.envVars[envFile]) {
      return this.envVars[envFile];
    }
    const content = await readFile(resolve(this.baseDir, envFile));
    const envVars = parse(content);
    this.envVars[envFile] = envVars;
    return envVars;
  }

  async buildContext(): Promise<Context> {
    const projectList = await this.projectService.getProjectsWithVersions();

    const projects = Object.fromEntries(
      projectList.map(p => [p.name, p])
    );

    const envFiles = await this.getEnvFiles();
    const rootEnvFile = envFiles.find(e => e.localeCompare('.env', undefined, { sensitivity: 'base' }));

    const envVars: Record<string, string | undefined> = rootEnvFile
      ? { ...process.env, ...await this.getEnvVarsFromFile(rootEnvFile) }
      : process.env;

    return {
      env: this.getCaseInsensitiveProxy(envVars),
      os: process.platform,
      projects: this.getCaseInsensitiveProxy(projects),
      ProjectCommandStatus,
      status: {},
      context: {},
    };
  }

  getCaseInsensitiveProxy<T>(target: Record<string, T>) {
    return new Proxy(target, {
      get(target, p) {
        if (typeof p !== 'string') {
          return undefined;
        }
        if (target[p]) {
          return target[p];
        }
        for (const projectName in target) {
          if (p.localeCompare(projectName, undefined, { sensitivity: 'base' }) === 0) {
            return target[projectName];
          }
        }
      }
    });
  }
}