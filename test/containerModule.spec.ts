import { Container } from 'inversify';
import { containerModule } from '../src/containerModule';
import { multiInjectTypes, singleInjectTypes } from '../src/TYPES';

describe('containerModule', () => {
  let container: Container;

  beforeAll(() => {
    container = new Container();
    container.load(containerModule);
  });

  test.each(Object.values(singleInjectTypes))('should have %p registered once', type => {
    expect(container.isBound(type)).toBe(true);

    container.get<unknown>(type); // Should not throw
  });

  test.each(Object.values(multiInjectTypes))('should have %p registered', type => {
    expect(container.isBound(type)).toBe(true);
  });
});
