import { Transform, TransformCallback } from 'stream';

export class StreamSplitter extends Transform {
  private lastLineData = '';

  constructor() {
    super({ objectMode: true, });
  }

  _transform(chunk: Buffer | string | unknown, _: string, callback: TransformCallback) {
    const data = `${this.lastLineData}${chunk}`;
    const lines = data.split(/\r?\n/);
    this.lastLineData = lines.splice(lines.length - 1, 1)[0];

    for (const line of lines) {
      this.push(line, 'utf8');
    }
    callback();
  }

  _flush(callback: TransformCallback) {
    if (this.lastLineData) {
      this.push(this.lastLineData);
    }
    this.lastLineData = '';
    callback();
  }
}
