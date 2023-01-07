import { Container } from 'inversify';
import { SimpleGit } from 'simple-git';
import { containerModule } from '../../src/containerModule';
import { RepositoryService, RepositoryServiceImpl } from '../../src/services/RepositoryService';
import { TYPES } from '../../src/TYPES';

describe(RepositoryServiceImpl, () => {
  let container: Container;
  let repositoryService: RepositoryService;
  let git: SimpleGit;

  beforeEach(async () => {
    container = new Container();
    container.load(containerModule);
    repositoryService = container.get(TYPES.RepositoryService);
    git = await container.get(TYPES.GitProvider);
  });

  describe('.getPathVersion', () => {
    test('when base path provided should return latest version', async () => {
      // Given
      const expectedHash = (await git.log({ maxCount: 1 })).latest?.hash;

      // When
      const version = await repositoryService.getPathVersion('/');

      // Verify
      expect(version).toMatchObject({
        hash: expectedHash,
        hashShort: expectedHash?.substring(0, 8),
      });
      expect(version).not.toMatchObject({
        hash: 'uncommitted',
        hashShort: 'uncommitted',
      });
    });
  });

  describe('.getLatestPathVersion', () => {
    test('when base path provided should return latest version', async () => {
      // Given
      const expectedHash = (await git.log({ maxCount: 1 })).latest?.hash;

      // When
      const version = await repositoryService.getLatestPathVersion('/');

      // Verify
      expect(version).toMatchObject({
        hash: expectedHash,
        hashShort: expectedHash?.substring(0, 8),
      });
    });
  });
});
