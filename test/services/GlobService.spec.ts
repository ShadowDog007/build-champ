jest.mock('fs');
jest.mock('fs/promises');

import { Container } from 'inversify';
import { TYPES } from '../../src/TYPES';
import { baseDir, createContainer, resetFs } from '../mocks';
import { GlobServiceImpl } from '../../src/services/GlobService';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

describe('GlobService', () => {
  let container: Container;
  let globService: GlobServiceImpl;

  beforeEach(async () => {
    await resetFs();
    container = await createContainer();

    globService = container.get(TYPES.GlobService);


    await writeFile(join(baseDir, 'file1.txt'), '1');
    await mkdir(join(baseDir, 'folder'), { recursive: true });
    await writeFile(join(baseDir, 'folder', 'file2.txt'), '2');
  });

  test('should be resolvable and singleton', () => {
    // Given
    container.restore(); // Reset to clear above mock setup

    // When
    const registeredInstance = container.get(TYPES.GlobService);

    // Verify
    expect(registeredInstance).toBeInstanceOf(GlobServiceImpl);
    expect(container.get(TYPES.GlobService)).toBe(registeredInstance);
  });

  describe(GlobServiceImpl.prototype.glob, () => {
    test('should return `/` path separators', async () => {
      // When
      const results: string[] = [];
      for await (const result of globService.glob('**/*'))
        results.push(result);

      // Verify
      expect(results).toEqual([
        '/file1.txt',
        '/folder/file2.txt'
      ]);
    });

    test('should match results with multiple patterns', async () => {
      // When
      const results: string[] = [];
      for await (const result of globService.glob(['*1.txt', '**/*2.txt']))
        results.push(result);

      // Verify
      expect(results).toEqual([
        '/file1.txt',
        '/folder/file2.txt'
      ]);
    });

    test('should consider ignore patterns', async () => {
      // When
      const results: string[] = [];
      for await (const result of globService.glob('**/*', { ignore: ['**/*2*'] }))
        results.push(result);

      // Verify
      expect(results).toEqual([
        '/file1.txt'
      ]);
    });

    test('should consider ignore patterns using !', async () => {
      // When
      const results: string[] = [];
      for await (const result of globService.glob('**/*', { ignore: ['!**/*2*'] }))
        results.push(result);

      // Verify
      expect(results).toEqual([
        '/folder/file2.txt'
      ]);
    });

    test.each([
      { ignore: 'folder/', expected: ['/file1.txt'] },
      { ignore: 'folder/*.txt', expected: ['/file1.txt'] },
      { ignore: '*.txt', expected: [] },
      { ignore: '*.txt\n!*2.txt', expected: ['/folder/file2.txt'] },
      { ignore: '*.txt\r\n!*2.txt', expected: ['/folder/file2.txt'] },
    ])
      ('should ignore matches present in .gitignore files ($ignore)', async ({ ignore, expected }) => {
        // Given
        await writeFile(join(baseDir, '.gitignore'), ignore);

        // When
        const results: string[] = [];
        for await (const result of globService.glob('**/*'))
          results.push(result);

        // Verify
        expect(results).toEqual(expected);
      });
  });

  test('should consider more specific .gitignore files', async () => {
    // Given
    await writeFile(join(baseDir, '.gitignore'), '*.txt');
    await writeFile(join(baseDir, 'folder', '.gitignore'), '!*.txt');

    // When
    const results: string[] = [];
    for await (const result of globService.glob('**/*'))
      results.push(result);

    // Verify
    expect(results).toEqual([
      '/folder/file2.txt'
    ]);
  });
});
