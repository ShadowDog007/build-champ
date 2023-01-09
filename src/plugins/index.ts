import { Container } from 'inversify';
import { uniq } from 'lodash';
import { ProviderTypes } from '../providers';
import { Plugin } from './Plugin';

export async function loadPluginModules(container: Container) {
  const workspaceConfiguration = await container.get(ProviderTypes.WorkspaceConfigurationProvider).get();

  const plugins = uniq([...Object.keys(workspaceConfiguration.plugins), 'default']);

  for (const pluginName of plugins) {
    const plugin = await getPlugin(pluginName);
    container.load(plugin.getContainerModule(workspaceConfiguration.plugins[pluginName]));
  }
}

async function getPlugin(plugin: string): Promise<Plugin> {
  try {
    // Check if this is an internal plugin
    return await import(`./${plugin}`);
  } catch {
    //
  }
  return import(plugin);
}