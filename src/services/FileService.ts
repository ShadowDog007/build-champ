import { readFile } from 'fs/promises';
import { inject, injectable } from 'inversify';
import { join } from 'path';
import 'reflect-metadata';
import { parse } from 'yaml';
import { ProviderTypes } from '../providers';
import { TYPES } from '../TYPES';

export interface FileService {
  readFileBuffer(repositoryPath: string): Promise<Buffer>;
  readFileUtf8(repositoryPath: string): Promise<string>;
  readFileYaml<T>(repositoryPath: string): Promise<T>;
}

@injectable()
export class FileServiceImpl implements FileService {

  constructor(
    @inject(ProviderTypes.BaseDirProvider) private readonly baseDir: Promise<string>,
  ) { }

  async readFileBuffer(repositoryPath: string) {
    return readFile(join(await this.baseDir, repositoryPath));
  }

  async readFileUtf8(repositoryPath: string) {
    return readFile(join(await this.baseDir, repositoryPath), 'utf8');
  }

  async readFileYaml<T>(repositoryPath: string): Promise<T> {
    const yaml = await this.readFileUtf8(repositoryPath);
    return parse(yaml);
  }
}
