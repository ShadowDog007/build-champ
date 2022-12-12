import { Command } from 'commander';

export class CommandTestHelper {

  readonly output = this.captureCommandOutput();

  constructor(
    private readonly command: Command
  ) { }

  async testParse(args: string[], expectedOutput: string[], {
    stripColor = true,
    ignoreErrors = false,
  } = {}) {
    // When
    try {
      await this.command.parseAsync(args, { from: 'user' });
    } catch (err) {
      if (!ignoreErrors) {
        console.error(this.output);
        throw err;
      }
    }

    // Verify
    const testOutput = stripColor
      // eslint-disable-next-line no-control-regex
      ? this.output.map(o => o.replaceAll(/\x1b\[\d+m/g, '').replaceAll(/[\r\n]/g, ''))
      : this.output;
    expect(testOutput).toMatchObject(expectedOutput);
  }

  async testParseError(args: string[], expectedExitCode: number, expectedErrorMessage: string) {
    let message: string;
    try {
      // When
      await this.command.parseAsync(args, { from: 'user' });
      throw new Error('Command did not exit as expected');
    } catch (err) {
      message = `${err}`;
    }

    expect(message).toBe(`Error: Command exited with code ${expectedExitCode}`);
    expect(this.output).toContain(expectedErrorMessage);
  }

  private captureCommandOutput() {
    const output: string[] = [];

    function write(message: string) {
      output.push(...message.split(/[\r\n]/).filter(m => !!m));
    }

    this.command.configureOutput({
      writeOut: write,
      writeErr: write,
    });

    this.command.exitOverride((err) => { throw new Error(`Command exited with code ${err.exitCode}`); });

    return output;
  }
}

export async function testErrorScenario(command: Command, args: string[], expectedExitCode: number) {
  let message: string;
  try {
    // When
    await command.parseAsync(args, { from: 'user' });
    throw new Error('Command did not exit as expected');
  } catch (err) {
    message = `${err}`;
  }

  expect(message).toBe(`Error: Command exited with code ${expectedExitCode}`);
}
