import { inject, injectable } from 'inversify';
import { cloneDeep } from 'lodash';
import 'reflect-metadata';
import safeEval from 'safe-eval';
import { ProjectWithVersion } from '../projects/Project';
import { ProjectCommandStatus } from '../projects/ProjectCommandStatus';
import { ProjectService } from '../projects/ProjectService';
import { TYPES } from '../TYPES';

export interface EvalService {
  readonly context: EvalContext;

  /**
   * Prepares initial context
   */
  prepareContext(): Promise<void>;

  /**
   * Ammends existing context values
   * @param context 
   */
  amendContext(context: Partial<EvalContextDynamic>): void;

  /**
   * Evaluates all code blocks in the provided template
   * @param template
   * @returns The processed template
   */
  safeEvalTemplate(template: string, context?: object): string;

  /**
   * Evaluates the provided code using a generated context
   * @param code The code to evaluate
   */
  safeEval(code: string): unknown;
}

export interface EvalContextFixed {
  readonly env: NodeJS.ProcessEnv,
  readonly os: NodeJS.Platform,
  readonly projects: Record<string, ProjectWithVersion>,
  readonly ProjectCommandStatus: typeof ProjectCommandStatus;
}

export interface EvalContextDynamic {
  /**
   * Current statuses of all projects
   */
  readonly status: Record<string, ProjectCommandStatus>;

  /**
   * Custom context variables
   */
  readonly context: Record<string, string>;
}

export interface EvalContext extends EvalContextFixed, EvalContextDynamic { }

@injectable()
export class EvalServiceImpl implements EvalService {
  get context() {
    if (!this._context) {
      throw new Error('Must call .prepareContext() first');
    }
    return this._context;
  }

  private _context?: EvalContext;

  constructor(
    @inject(TYPES.ProjectService) private readonly projectService: ProjectService
  ) {
  }

  async prepareContext() {
    if (!this._context) {
      this._context = await this.buildContext();
    }
  }

  amendContext(context: Partial<EvalContextDynamic>) {
    const proxies = Object.fromEntries(
      Object.entries(cloneDeep(context))
        .map(([k, v]) => ([k, this.getCaseInsensitiveProxy(v)]))
    );
    this._context = {
      ...this.context,
      ...proxies,
    };
  }

  safeEvalTemplate(template: string, context?: object): string {
    return template.replaceAll(/\$\{\{((?:.|[\r\n])+?)\}\}/gm,
      (_, code) => `${this.safeEval(code, context)}`);
  }

  safeEval(code: string, context?: object): unknown {
    return safeEval(code, context ?? this.context);
  }

  async buildContext(): Promise<EvalContext> {
    const projectList = await this.projectService.getProjectsWithVersions();

    const projects = Object.fromEntries(
      projectList.map(p => [p.name, p])
    );
    return {
      env: this.getCaseInsensitiveProxy(process.env),
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
