import { injectable } from 'inversify';
import 'reflect-metadata';
import { VM } from 'vm2';
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
    const vm = new VM({
      sandbox: context,
    });

    return vm.run(code);
  }
}
