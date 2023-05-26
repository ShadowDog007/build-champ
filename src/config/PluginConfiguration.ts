import { TargetDefaults } from './TargetDefaults';

export interface PluginConfiguration<KnownTargets extends string = string, Targets extends TargetDefaults = TargetDefaults> {
  /**
   * Flag to disable loading of this plugin
   */
  enabled?: false;

  /**
   * Target configuration
   */
  targetDefaults?: Partial<Record<KnownTargets, Targets>>;

  /**
   * Target configuration overrides by source
   */
  sourceTargetDefaults?: Record<string, Record<KnownTargets, Targets>>;
}
