jest.mock('fs');
jest.mock('fs/promises');

import { Container } from 'inversify';
import { containerModule } from '../src/containerModule';
import { loadPluginModules } from '../src/plugins';
import { multiInjectTypes, singleInjectTypes } from '../src/TYPES';
import { resetFs } from './mocks';

describe('containerModule', () => {
  let container: Container;

  beforeAll(async () => {
    await resetFs();
    container = new Container();
    container.load(containerModule);
    await loadPluginModules(container);
  });

  test.each(Object.values(singleInjectTypes))('should have %p registered once', type => {
    expect(container.isBound(type)).toBe(true);

    container.get<unknown>(type); // Should not throw
  });

  test.each(Object.values(multiInjectTypes))('should have %p registered', type => {
    expect(container.isBound(type)).toBe(true);
  });
});
