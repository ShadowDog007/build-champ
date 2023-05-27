jest.mock('child_process');

import { ChildProcess, spawn } from 'child_process';
import { Container } from 'inversify';
import 'reflect-metadata';
import { SpawnServiceImpl } from '../../src/services/SpawnService';
import { TYPES } from '../../src/TYPES';
import { createContainer } from '../mocks';

describe(SpawnServiceImpl, () => {
  let container: Container;
  let service: SpawnServiceImpl;

  beforeEach(async () => {
    container = await createContainer();
    service = container.get(TYPES.SpawnService);
  });

  test('should be resolvable from container and singleton', () => {
    const instance = container.get(TYPES.SpawnService);

    expect(instance).toBeInstanceOf(SpawnServiceImpl);
    expect(instance).toBe(service);
  });

  test('should call spawn from child_process', () => {
    const spawnMock = jest.mocked(spawn);
    const mockResponse = {};
    jest.mocked(spawn).mockReturnValue(mockResponse as ChildProcess);

    const args: string[] = [];
    const options = {};

    // When
    const response = service.spawn('test', args, options);

    // Verify
    expect(response).toBe(mockResponse);
    expect(spawnMock).toBeCalledWith('test', args, options);
  });
});
