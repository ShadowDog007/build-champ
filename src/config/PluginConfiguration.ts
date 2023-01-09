import { TargetDefaults } from './TargetDefaults';

export interface PluginConfiguration<Targets extends TargetDefaults = TargetDefaults> {
  /**
   * Target configuration
   */
  targetDefaults?: Partial<Record<string, Targets>>;

  /**
   * Target configuration overrides by source
   */
  sourceTargetDefaults?: Record<string, Targets>;
}
