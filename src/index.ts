#!/usr/bin/env node
import { Container } from 'inversify';
import 'reflect-metadata';
import { containerModule } from './containerModule';
import { loadPluginModules } from './plugins';
import { ProviderTypes } from './providers';



async function start() {
  const container = new Container();
  container.load(containerModule);

  await loadPluginModules(container);

  const program = await container.get(ProviderTypes.ProgramProvider).get();
  await program.parseAsync();
}

start();
