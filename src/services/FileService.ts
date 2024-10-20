import { readFile } from 'fs/promises';
import { inject, injectable } from 'inversify';
import { join } from 'path';
import 'reflect-metadata';
import { parse } from 'yaml';
import { Provider, ProviderTypes } from '../providers';
import { createReadStream } from 'fs';
import { StreamHelpers } from '../util/StreamHelpers';

export interface FileService {
  readFileBuffer(repositoryPath: string): Promise<Buffer>;
  readFileUtf8(repositoryPath: string): Promise<string>;
  readFileUtf8Lines(repositoryPath: string): AsyncGenerator<string>;
  readFileYaml<T>(repositoryPath: string): Promise<T>;
}

@injectable()
export class FileServiceImpl implements FileService {

  constructor(
    @inject(ProviderTypes.BaseDirProvider) private readonly baseDir: Provider<string>,
  ) { }

  async readFileBuffer(repositoryPath: string) {
    return readFile(join(await this.baseDir.get(), repositoryPath));
  }

  async readFileUtf8(repositoryPath: string) {
    return readFile(join(await this.baseDir.get(), repositoryPath), 'utf8');
  }

  async *readFileUtf8Lines(repositoryPath: string): AsyncGenerator<string> {
    const fileStream = createReadStream(join(await this.baseDir.get(), repositoryPath), 'utf8');

    for await (const line of StreamHelpers.readLines(fileStream)) {
      yield line;
    }
  }

  async readFileYaml<T>(repositoryPath: string): Promise<T> {
    try {
      const yaml = await this.readFileUtf8(repositoryPath);
      return parse(yaml);
    } catch (error) {
      if (error instanceof Error) {
        error.message = `Error reading yaml from '${repositoryPath}': ` + error.message;
      }
      throw error;
    }
  }
}
