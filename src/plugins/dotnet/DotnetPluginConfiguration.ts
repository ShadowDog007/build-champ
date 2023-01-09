import { PluginConfiguration } from '../../config/PluginConfiguration';
import { TargetDefaults } from '../../config/TargetDefaults';
import { DotnetTargets } from './DotnetTargets';

export interface DotnetPluginConfiguration extends PluginConfiguration {
  targetDefaults?: Partial<Record<DotnetTargets, TargetDefaults>>;
}
