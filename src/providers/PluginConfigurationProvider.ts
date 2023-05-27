import { inject, injectable, multiInject } from 'inversify';
import { PluginConfiguration } from '../config/PluginConfiguration';
import { WorkspaceConfiguration } from '../config/WorkspaceConfiguration';
import { PluginTypes } from '../plugins/PluginTypes';
import { Provider, ProviderTypes } from './index';

@injectable()
export class PluginConfigurationProvider extends Provider<PluginConfiguration, symbol> {
  constructor(
    @inject(ProviderTypes.WorkspaceConfigurationProvider) private readonly workspaceConfiguration: Provider<WorkspaceConfiguration>,
    @multiInject(PluginTypes.PluginIdentifierConfigMapping) private readonly mapping: [symbol, string][]
  ) {
    super();
  }

  async provider(key: symbol) {
    const mapping = this.mapping.find(([identifier]) => identifier === key);
    if (!mapping) {
      throw new Error(`No mapping for symbol ${key.description}`);
    }
    const [, pluginKey] = mapping;

    const config = await this.workspaceConfiguration.get();
    return config.plugins[pluginKey];
  }
}
