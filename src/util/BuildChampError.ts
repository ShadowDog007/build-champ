/**
 * Custom errors which are logged by all commands without stack traces.
 * Ends processing of the command.
 */
export class BuildChampError extends Error {
  constructor(message: string) {
    super(message);
  }
}
