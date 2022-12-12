export enum ProjectCommandStatus {
  /**
   * Project was skipped, either because it doesn't have a matching command or it's condition check failed
   */
  skipped = 'skipped',

  /**
   * Waiting for run
   */
  pending = 'pending',

  /**
   * Running
   */
  running = 'running',

  /**
   * Command failed
   */
  failed = 'failed',

  /**
   * Command succeeded
   */
  success = 'success',
}
