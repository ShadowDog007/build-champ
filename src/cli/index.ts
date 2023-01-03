import { BaseProjectCommand } from './BaseProjectCommand';
import { InitCommand } from './InitCommand';
import { ListCommand } from './ListCommand';
import { RunCommand } from './RunCommand';
import { TemplateCommand } from './TemplateCommand';

export const commands = [
  InitCommand,
  ListCommand,
  RunCommand,
  TemplateCommand,
]satisfies (new (...args: never[]) => BaseProjectCommand<unknown[]>)[];
