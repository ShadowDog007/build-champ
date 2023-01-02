import { parse } from 'dotenv';
import { expand } from 'dotenv-expand';
import { readFile } from 'fs/promises';
import { inject, injectable } from 'inversify';
import minimatch from 'minimatch';
import { resolve } from 'path';
import 'reflect-metadata';
import { TYPES } from '../TYPES';
import { globAsync } from './globAsync';
import { Project, ProjectWithVersion } from '../projects/Project';
import { ProjectCommandStatus } from '../projects/ProjectCommandStatus';
import { ProjectService } from '../projects/ProjectService';
import { env } from 'process';

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

  /**
   * Get current project status
   * @param project
   */
  getProjectStatus(project: Project): ProjectCommandStatus;

  /**
   * Set current project status
   * @param project 
   * @param status 
   */
  setProjectStatus(project: Project, status: ProjectCommandStatus): void;

  /**
   * Parses and saves context parameters
   * @param values context values from command args
   */
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
    const environment = await this.getEnvVarsForProject(project, command);

    return {
      ...context,
      env: this.getCaseInsensitiveProxy({
        ...env,
        ...environment,
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
      const fileDepth = (f: string) => Array.from(f.matchAll(/[/\\]/g)).length;
      // Sort by hierarchy count, then target
      this.envFiles.sort((a, b) => {
        const depth = fileDepth(a) - fileDepth(b);
        return depth === 0 ? a.length - b.length : depth;
      });
    }

    return this.envFiles;
  }

  async getEnvFileForDir(dir: string, command?: string) {
    const envPattern = command
      ? `{.env,.${command}.env}`
      : '.env';

    const checkDirs = [
      '',
      ...Array.from(dir.matchAll(/[/\\]/g))
        .map(m => dir.slice(0, m.index) + '/'),
      `${dir}/`,
    ];

    const dirPattern = `{${checkDirs.join(',')}}`;

    const pattern = `${dirPattern}${envPattern}`;
    return (await this.getEnvFiles())
      .filter(f => minimatch(f, pattern, { nocase: true }));
  }

  async getEnvVarsForDir(dir: string, command?: string, baseEnv: Record<string, string> = {}) {
    const files = await this.getEnvFileForDir(dir, command);
    const fileEnvVars = await Promise.all(files.map(f => this.getUnexpandedEnvVarsFromFile(f)));

    const envVars = fileEnvVars.reduce((result, vars) => ({ ...result, ...vars }), {
      ...baseEnv,
      ...Object.fromEntries(
        Object.entries(this.contextParameters)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [`CONTEXT_${key.toUpperCase()}`, value])
      )
    });

    const expandResult = expand({ parsed: envVars, ignoreProcessEnv: true });
    if (!expandResult.parsed) {
      throw (expandResult.error || new Error(`Unknown error when parsing env vars for ${dir}`));
    }
    return expandResult.parsed;
  }

  async getEnvVarsForProject(project: ProjectWithVersion, command?: string) {
    return this.getEnvVarsForDir(project.dir, command, {
      REPOSITORY_DIR: this.baseDir,
      PROJECT_NAME: project.name,
      PROJECT_VERSION: project.version.hash,
      PROJECT_VERSION_SHORT: project.version.hashShort,
    });
  }

  async getUnexpandedEnvVarsFromFile(envFile: string) {
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
      ? { ...env, ...await this.getUnexpandedEnvVarsFromFile(rootEnvFile) }
      : env;

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