import { Command } from 'commander';
import { Container } from 'inversify';
import 'reflect-metadata';
import { containerModule } from './containerModule';
import { TYPES } from './TYPES';

const container = new Container();
container.load(containerModule);

const program = container.get<Command>(TYPES.Program);
program.parseAsync();
