jest.mock('fs');
jest.mock('fs/promises');

import { mkdirSync } from 'fs';
import { Container } from 'inversify';
import { join } from 'path';
import { containerModule } from '../../src/containerModule';
import { Provider } from '../../src/providers';
import { BaseDirProvider } from '../../src/providers/BaseDirProvider';
import { TYPES } from '../../src/TYPES';
import { resetFs } from '../mocks';

describe('BaseDirProvider', () => {
  let container: Container;
  let baseDirProvider: Provider<string>;

  beforeEach(async () => {
    await resetFs();
    container = new Container();
    container.load(containerModule);

    baseDirProvider = container.get(TYPES.BaseDirProvider);
  });

  test('should be resolvable and be singleton', () => {
    // Verify
    expect(baseDirProvider).toBeInstanceOf(BaseDirProvider);
    expect(container.get(TYPES.BaseDirProvider)).toBe(baseDirProvider);
  });

  test.each(['/repo', '/projects/repo'])('when git repo exists in %s should find base dir', async dir => {
    const spy = jest.spyOn(process, 'cwd');
    spy.mockReturnValue(join(dir, 'some-child-dir'));

    mkdirSync(join(dir, '.git'), { recursive: true });

    expect((await baseDirProvider.get()).replaceAll(/\\/g, '/')).toBe(dir);
  });
});
