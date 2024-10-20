import { createInterface } from 'readline/promises';
import { Readable } from 'stream';

export class StreamHelpers {
  static async *readLines(stream: Readable): AsyncGenerator<string> {
    stream.setEncoding('utf8');

    for await (const line of createInterface(stream))
      yield line;
  }
}
