jest.mock('fs');
jest.mock('fs/promises');

import { BaseDirProvider, BaseDirProviderImpl } from '@/providers/BaseDirProvider';
import { TYPES } from '@/TYPES';
import { mkdirSync } from 'fs';
import { Container } from 'inversify';
import { join } from 'path';
import { createContainer, resetFs } from '../mocks';

describe('BaseDirProvider', () => {
  let container: Container;
  let baseDirProvider: BaseDirProvider;

  beforeEach(async () => {
    await resetFs();
    container = createContainer();

    baseDirProvider = container.get(TYPES.BaseDirProvider);
  });

  test('should be resolvable and be singleton', () => {
    // Verify
    expect(baseDirProvider).toBeInstanceOf(BaseDirProviderImpl);
    expect(container.get(TYPES.BaseDirProvider)).toBe(baseDirProvider);
  });

  test.each(['/repo', '/projects/repo'])('when git repo exists in %s should find base dir', dir => {
    const spy = jest.spyOn(process, 'cwd');
    spy.mockReturnValue(join(dir, 'some-child-dir'));

    mkdirSync(join(dir, '.git'), { recursive: true });

    expect(baseDirProvider.baseDir.replaceAll(/\\/g, '/')).toBe(dir);
  });
});
