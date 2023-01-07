import { TargetDefaults } from './TargetDefaults';

export interface PluginConfiguration {
  targetDefaults?: Partial<Record<string, TargetDefaults>>;
}
