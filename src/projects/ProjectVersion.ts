/**
 * Represents the commit which last changed this project or it's dependencies
 */
export interface ProjectVersion {
  /**
   * Full git commit hash
   */
  hash: string;

  /**
   * First 8 characters of the git commit hash
   */
  hashShort: string;

  /**
   * Time of the git commit
   */
  timestamp: Date;
}
