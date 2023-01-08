import { Command } from 'commander';
import { injectable, multiInject } from 'inversify';
import 'reflect-metadata';
import { ValueProvider } from '.';
import { version } from '../../package.json';
import { BaseProjectCommand } from '../cli/BaseProjectCommand';
import { TYPES } from '../TYPES';

@injectable()
export class ProgramProvider extends ValueProvider<Command> {
  constructor(@multiInject(TYPES.Command) private readonly commands: BaseProjectCommand<unknown[]>[]) {
    super();
  }

  async provider() {
    const command = new Command();
    command.version(version);
    this.commands.forEach(c => command.addCommand(c.command));
    return command;
  }
}
