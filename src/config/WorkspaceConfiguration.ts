import { DotnetPluginConfiguration } from '../plugins/dotnet/DotnetConfiguration';
import { PluginConfiguration } from './PluginConfiguration';

export interface WorkspaceConfiguration {
  /**
   * List of enabled plugins
   */
  plugins: Record<string, PluginConfiguration> & { dotnet: DotnetPluginConfiguration; };

  /**
   * Glob patterns to match projects to be loaded
   */
  sources: string[];
}
