export interface ProjectCommand {

  /**
   * Name of this command
   */
  name?: string;

  /**
   * Command to run (File executable or shell command)
   */
  command: string;

  /**
   * Directory to run this command from
   * 
   * @default Directory the project file is in
   */
  workingDirectory?: string;

  /**
   * Run the command in a specific or default shell
   * 
   * e.g. 'Powershell.exe', '/bin/bash'
   * 
   * @default Runs in OS default shell
   */
  shell?: boolean | string;

  /**
   * Arguments to pass to the command
   */
  arguments?: string[];

  /**
   * Condition expression evaluated before command runs
   */
  condition?: string;

  /**
   * How the command behaves if the condition evaluates to false
   * 
   * @default 'skip'
   */
  conditionBehaviour?: 'skip' | 'fail';

  /**
   * How the command behaves if the process fails
   * @default 'fail'
   */
  failureBehavior?: 'fail' | 'skip';
}
