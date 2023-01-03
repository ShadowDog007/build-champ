jest.mock('fs');
jest.mock('fs/promises');

import { mkdirSync } from 'fs';
import { Container } from 'inversify';
import { join } from 'path';
import { ValueProvider } from '../../src/providers';
import { BaseDirProvider } from '../../src/providers/BaseDirProvider';
import { TYPES } from '../../src/TYPES';
import { createContainer, resetFs } from '../mocks';

describe('BaseDirProvider', () => {
  let container: Container;
  let baseDirProvider: ValueProvider<string>;

  beforeEach(async () => {
    await resetFs();
    container = createContainer();

    baseDirProvider = container.get(TYPES.BaseDirProvider);
  });

  test('should be resolvable and be singleton', () => {
    // Verify
    expect(baseDirProvider).toBeInstanceOf(BaseDirProvider);
    expect(container.get(TYPES.BaseDirProvider)).toBe(baseDirProvider);
  });

  test.each(['/repo', '/projects/repo'])('when git repo exists in %s should find base dir', dir => {
    const spy = jest.spyOn(process, 'cwd');
    spy.mockReturnValue(join(dir, 'some-child-dir'));

    mkdirSync(join(dir, '.git'), { recursive: true });

    expect(baseDirProvider.value.replaceAll(/\\/g, '/')).toBe(dir);
  });
});
