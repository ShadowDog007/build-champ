import { injectable } from 'inversify';
import 'reflect-metadata';
import { Context } from './ContextService';
import { Isolate } from 'isolated-vm';

export interface EvalService {
  /**
   * Evaluates all code blocks in the provided template
   * @param template
   * @param context Context values to pass to script
   * @returns The processed template
   */
  safeEvalTemplateAsync<T extends Context>(template: string, context: T): Promise<string>;

  /**
   * Evaluates the provided code using a generated context
   * @param code The code to evaluate
   * @param context Context values to pass to script
   */
  safeEvalAsync<T extends Context>(code: string, context: T): unknown;
}

@injectable()
export class EvalServiceImpl implements EvalService {
  private readonly isolate = new Isolate();

  async safeEvalTemplateAsync<T extends Context>(template: string, context: T): Promise<string> {
    const templateRegex = /\$\{\{((?:.|[\r\n])+?)\}\}/gm;


    const evalMatches = template.match(templateRegex)
      // slice out the replacement tokens
      ?.map(match => match.slice(3, match.length - 2))
      // eval all the templates
      .map(template => template);

    if (!evalMatches) {
      // Template contains nothing to be evaluated
      return template;
    }

    const vm = await this.isolate.createContext();

    try {
      const setTasks: Promise<void>[] = [];
      for (const [key, val] of Object.entries(context)) {
        // TODO - this is throwing errors
        setTasks.push(vm.global.set(key, val));
      }
      await Promise.all(setTasks);

      const evalResults = await Promise.all(evalMatches.map(match => vm.eval(match)));
      return template.replaceAll(templateRegex, () => evalResults.shift());

    } finally {
      vm.release();
    }
  }

  async safeEvalAsync<T extends Context>(code: string, context: T): Promise<string> {
    const vm = await this.isolate.createContext();

    try {
      const setTasks: Promise<void>[] = [];
      for (const [key, val] of Object.entries(context)) {
        setTasks.push(vm.global.set(key, val));
      }
      await Promise.all(setTasks);

      return vm.eval(code);
    } finally {
      vm.release();
    }

  }
}
