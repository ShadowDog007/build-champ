import { parse } from 'dotenv';
import { expand } from 'dotenv-expand';
import { inject, injectable } from 'inversify';
import { minimatch } from 'minimatch';
import 'reflect-metadata';
import { TYPES } from '../TYPES';
import { Project, ProjectWithVersion } from '../models/Project';
import { ProjectCommandStatus } from '../models/ProjectCommandStatus';
import { ProjectService } from './ProjectService';
import { env } from 'process';
import { GlobService } from './GlobService';
import { FileService } from './FileService';
import { join } from 'path';
import { Provider } from '../providers';
import { PromiseCache } from '../util/PromiseCache';

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

/**
 * Stores context variables used in expressions
 */
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
  private readonly envFiles = new PromiseCache(
    () => this.loadEnvFiles());
  private readonly context = new PromiseCache(
    () => this.buildContext());

  private readonly projectStatuses: Record<string, ProjectCommandStatus> = this.getCaseInsensitiveProxy({});
  private readonly contextParameters: Record<string, string> = this.getCaseInsensitiveProxy({});

  private readonly envVars: Record<string, Record<string, string>> = {};

  constructor(
    @inject(TYPES.BaseDirProvider) private readonly baseDir: Provider<string>,
    @inject(TYPES.FileService) private readonly fileService: FileService,
    @inject(TYPES.GlobService) private readonly globService: GlobService,
    @inject(TYPES.ProjectService) private readonly projectService: ProjectService,
  ) { }

  async getContext(): Promise<Context> {
    return {
      ...await this.context.get(),
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

  /**
   * @returns Array of all environment variable files in the repository
   */
  async getEnvFiles(): Promise<string[]> {
    return this.envFiles.get();
  }

  async loadEnvFiles(): Promise<string[]> {
    const envFiles: string[] = [];

    for await (const envFile of this.globService.glob('**/.{*.env,env}')) {
      envFiles.push(envFile);
    }

    const fileDepth = (f: string) => Array.from(f.matchAll(/[/\\]/g)).length;
    // Sort by hierarchy count, then target
    return envFiles.sort((a, b) => {
      const depth = fileDepth(a) - fileDepth(b);
      return depth === 0 ? a.length - b.length : depth;
    });
  }

  /**
   * Loads all the env files are relevant for this directory and command scope
   * @param dir Directory to start search from
   * @param command Command scope
   * @returns Array of matching env files
   */
  async getEnvFileForDir(dir: string, command?: string) {
    const envPattern = command
      ? `{.env,.${command}.env}`
      : '.env';

    const checkDirs = Array.from(`${dir}/`.matchAll(/[/\\]/g))
      .map(m => dir.slice(0, m.index) + '/');

    const dirPattern = `{${checkDirs.join(',')}}`;

    const pattern = `${dirPattern}${envPattern}`;
    return (await this.getEnvFiles())
      .filter(f => minimatch(f, pattern, { nocase: true }));
  }

  /**
   * Loads and expands the environment variables from env files
   * @param dir Directory to start search from
   * @param command Command scope
   * @param baseEnv Additional environment variables to include
   * @returns Expanded environment variables
   */
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

    const expandResult = expand({ parsed: envVars, processEnv: {} });
    if (expandResult.error) {
      throw expandResult.error;
    }
    return expandResult.parsed;
  }

  /**
   * Same as `getEnvVarsForDir` but includes additional project environment variables as a base
   * @param project
   * @param command
   * @returns
   */
  async getEnvVarsForProject(project: ProjectWithVersion, command?: string) {
    const baseDir = await this.baseDir.get();
    return this.getEnvVarsForDir(project.dir, command, {
      REPOSITORY_DIR: baseDir,
      PROJECT_NAME: project.name,
      PROJECT_DIR: join(baseDir, project.dir),
      PROJECT_VERSION: project.version.hash,
      PROJECT_VERSION_SHORT: project.version.hashShort,
    });
  }

  /**
   * Loads environment variables from the provided file (before expansion)
   * @param envFile File to load
   * @returns Environment variables from provided file
   */
  async getUnexpandedEnvVarsFromFile(envFile: string) {
    if (this.envVars[envFile]) {
      return this.envVars[envFile];
    }
    const content = await this.fileService.readFileBuffer(envFile);
    const envVars = parse(content);
    this.envVars[envFile] = envVars;
    return envVars;
  }

  /**
   * Builds the base (unscoped) context
   * @returns Context
   */
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

  /**
   * Creates a proxy to the target which is case insensitive
   * @param target
   * @returns
   */
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