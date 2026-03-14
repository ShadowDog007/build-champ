import { injectable } from 'inversify';
import 'reflect-metadata';
// Node.js built-in vm module is used to evaluate template expressions in an
// isolated context so that only explicitly-provided context variables are in
// scope.  The vm module is not a security sandbox – it is used here purely
// for scope isolation of user-authored configuration templates.
import { createContext, runInContext } from 'vm';
import { Context } from './ContextService';

export interface EvalService {
  /**
   * Evaluates all code blocks in the provided template
   * @param template
   * @param context Context values to pass to script
   * @returns The processed template
   */
  safeEvalTemplate<T extends Context>(template: string, context: T): string;

  /**
   * Evaluates the provided code using a generated context
   * @param code The code to evaluate
   * @param context Context values to pass to script
   */
  safeEval<T extends Context>(code: string, context: T): unknown;
}

@injectable()
export class EvalServiceImpl implements EvalService {
  safeEvalTemplate<T extends Context>(template: string, context: T): string {
    return template.replaceAll(/\$\{\{((?:.|[\r\n])+?)\}\}/gm,
      (_, code) => `${this.safeEval(code, context)}`);
  }

  safeEval<T extends Context>(code: string, context: T): unknown {
    const sandbox = createContext({ ...context });
    return runInContext(code, sandbox);
  }
}
