import { TargetDefaults } from './TargetDefaults';

export interface PluginConfiguration<KnownTargets extends string = string, Targets extends TargetDefaults = TargetDefaults> {
  /**
   * Target configuration
   */
  targetDefaults?: Partial<Record<KnownTargets, Targets>>;

  /**
   * Target configuration overrides by source
   */
  sourceTargetDefaults?: Record<string, Record<KnownTargets, Targets>>;
}
