import { Container } from 'inversify';
import { ProviderTypes } from '../providers';
import { Plugin } from './Plugin';
import { PluginTypes } from './PluginTypes';

import DefaultPlugin from './default';
import DotnetPlugin from './dotnet';

export async function loadPluginModules(container: Container) {
  const workspaceConfiguration = await container.get(ProviderTypes.WorkspaceConfigurationProvider).get();

  const plugins = Object.entries(workspaceConfiguration.plugins)
    .filter(([, config]) => config.enabled ?? true)
    .map(([plugin]) => plugin);

  for (const pluginName of plugins) {
    await loadPluginModule(container, pluginName);
  }
}

export async function loadPluginModule(container: Container, pluginName: string) {
  const plugin = await getPlugin(pluginName);
  container.load(plugin.getContainerModule());
  container.bind(PluginTypes.PluginIdentifierConfigMapping).toConstantValue([plugin.pluginIdentifier, pluginName]);
}

const knownPlugins: Record<string, Plugin> = {
  'default': DefaultPlugin,
  'dotnet': DotnetPlugin,
};

async function getPlugin(plugin: string): Promise<Plugin> {

  if (knownPlugins[plugin]) {
    return knownPlugins[plugin];
  }

  const module: { default: Plugin; } = await import(plugin);
  return module.default;
}