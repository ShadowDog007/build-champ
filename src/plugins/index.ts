import { Container } from 'inversify';
import { ProviderTypes } from '../providers';
import { Plugin } from './Plugin';
import { PluginTypes } from './PluginTypes';

export async function loadPluginModules(container: Container) {
  const workspaceConfiguration = await container.get(ProviderTypes.WorkspaceConfigurationProvider).get();

  const plugins = Object.entries(workspaceConfiguration.plugins)
    .filter(([, config]) => config.enabled ?? true)
    .map(([plugin]) => plugin);

  for (const pluginName of plugins) {
    const plugin = await getPlugin(pluginName);
    container.load(plugin.getContainerModule());
    container.bind(PluginTypes.PluginIdentifierConfigMapping).toConstantValue([plugin.pluginIdentifier, pluginName]);
  }
}

async function getPlugin(plugin: string): Promise<Plugin> {
  let module: { default: Plugin; };

  try {
    module = await import(`./${plugin}`);
  } catch {
    module = await import(plugin);
  }

  return module.default;
}