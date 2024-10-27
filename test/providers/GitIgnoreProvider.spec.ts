jest.mock('fs');
jest.mock('fs/promises');

import { Container } from 'inversify';
import { GitIgnore, GitIgnoreImpl } from '../../src/providers/GitIgnoreProvider';
import { baseDir, createContainer, resetFs } from '../mocks';
import { TYPES } from '../../src/TYPES';
import { Provider } from '../../src/providers';
import { GlobService } from '../../src/services/GlobService';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

describe(GitIgnoreImpl, () => {
  let container: Container;
  let provider: Provider<GitIgnore>;
  let globService: GlobService;

  beforeEach(async () => {
    await resetFs();

    container = await createContainer();
    provider = container.get(TYPES.GitIgnoreProvider);
    globService = container.get(TYPES.GlobService);
  });

  async function createFile(file: string) {
    const fullPath = join(baseDir, file);
    await mkdir(dirname(fullPath), { recursive: true });

    await writeFile(fullPath, '');
  }

  async function createGitIgnore(path: string | undefined, patterns: string | string[]) {
    const dir = join(baseDir, path ?? '');
    const content = typeof patterns === 'string'
      ? patterns
      : patterns.join('\n');
    await writeFile(join(dir, '.gitignore'), content);
  }

  test.each([
    { path: '', ignore: 'bin', file: 'dir/bin/file.txt' },
    { path: '', ignore: 'bin/', file: 'dir/bin/file.txt' },
    { path: '', ignore: 'dir/bin', file: 'dir/bin/file.txt' },
    { path: '', ignore: 'dir/bin/', file: 'dir/bin/file.txt' },
    { path: '', ignore: '*.txt', file: 'file.txt' },
    { path: '', ignore: '*.txt', file: 'dir/file.txt' },
    { path: '', dir: 'dir/file.txt', ignore: '*.txt', file: 'dir/file.txt' },
    { path: 'dir', ignore: 'bin', file: 'dir/bin/file.txt' },
  ])('should ignore $file given $path/.gitignore with $ignore', async ({ path, ignore, file }) => {
    // Given
    await createFile(file);
    await createGitIgnore(path, ignore);

    // When
    const matches = await globService.globList('**/*');

    // Verify
    expect(matches).toMatchObject([]);
  });

  test.each([
    { path: '', ignore: 'node_modules', file: 'dir/file.txt' },
    { path: '', ignore: ['*.txt', '!*.include.txt'], file: 'dir/file.include.txt' },
    { path: 'dir', ignore: ['*.txt', '!*.include.txt'], file: 'dir/file.include.txt' },
  ])('should match $file given $path/.gitignore with $ignore', async ({ path, ignore, file }) => {
    // Given
    await createFile(file);
    await createGitIgnore(path, ignore);

    // When
    const matches = await globService.globList('**/*');

    // Verify
    expect(matches).toMatchObject([`/${file}`]);
  });
});