
export interface TargetDefaults {
  /**
   * Glob pattern matching projects for which this target should be enabled
   *
   * @default '**'
   */
  enabled: string | false;

  /**
   * Override target name
   */
  targetName: string;

  /**
   * Regex matching targets which should be run before running this target
   */
  dependsOn: string[];

  /**
   * Default arguments to provide to this target
   *
   * @default string[] Determined by plugin
   */
  arguments: string[];
}
