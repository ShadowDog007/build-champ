import { Container } from 'inversify';
import { uniq } from 'lodash';
import { ProviderTypes } from '../providers';
import { Plugin } from './Plugin';

export async function loadPluginModules(container: Container) {
  const workspaceConfiguration = await container.getAsync(ProviderTypes.WorkspaceConfigurationProvider);

  const plugins = uniq(['default', ...Object.keys(workspaceConfiguration.plugins)]);

  for (const pluginName of plugins) {
    const plugin = await getPlugin(pluginName);
    container.load(plugin.getContainerModule());
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