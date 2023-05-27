import { DotnetPluginConfiguration } from '../plugins/dotnet/DotnetPluginConfiguration';
import { PluginConfiguration } from './PluginConfiguration';

export interface WorkspaceConfiguration {
  /**
   * List of enabled plugins
   */
  plugins: PluginConfigurationRecord;

  /**
   * Glob patterns to match projects to be loaded.
   * Can use patterns prefixed with `!` to exclude projects`
   */
  sources: string[];
}

export type PluginConfigurationRecord = Record<string, PluginConfiguration>
  & { dotnet?: DotnetPluginConfiguration; };
