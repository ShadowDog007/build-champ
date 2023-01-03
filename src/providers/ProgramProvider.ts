import { Command } from 'commander';
import { injectable, multiInject } from 'inversify';
import 'reflect-metadata';
import { ValueProvider } from '.';
import { version } from '../../package.json';
import { BaseProjectCommand } from '../cli/BaseProjectCommand';
import { TYPES } from '../TYPES';

@injectable()
export class ProgramProvider implements ValueProvider<Command> {
  readonly value: Command;

  constructor(@multiInject(TYPES.Command) commands: BaseProjectCommand<unknown[]>[]) {
    this.value = new Command();
    this.value.version(version);
    commands.forEach(c => this.value.addCommand(c.command));
  }
}