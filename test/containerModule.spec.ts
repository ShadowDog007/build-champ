import { containerModule } from '@/containerModule';
import { multiInjectTypes, singleInjectTypes } from '@/TYPES';
import { Container } from 'inversify';

describe('containerModule', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.load(containerModule);
  });

  test.each(Object.values(singleInjectTypes))('should have %p registered once', type => {
    expect(container.isBound(type)).toBe(container.isBound(type));

    container.get(type); // Should not throw
  });

  test.each(Object.values(multiInjectTypes))('should have %p registered', type => {
    expect(container.isBound(type));
  });
});
