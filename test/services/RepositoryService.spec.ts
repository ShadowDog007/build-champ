import { Container } from 'inversify';
import { SimpleGit } from 'simple-git';
import { containerModule } from '../../src/containerModule';
import { RepositoryService, RepositoryServiceImpl } from '../../src/services/RepositoryService';
import { TYPES } from '../../src/TYPES';

describe(RepositoryServiceImpl, () => {
  let container: Container;
  let repositoryService: RepositoryService;
  let git: SimpleGit;

  beforeEach(() => {
    container = new Container();
    container.load(containerModule);
    repositoryService = container.get(TYPES.RepositoryService);
    git = container.get(TYPES.Git);
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
    });

    test('when new path provided should return latest version', async () => {
      // When
      const version = await repositoryService.getPathVersion('definately-will-never-exist.txt');

      // Verify
      expect(version).toMatchObject({
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

  describe('.getChanges', () => {
    test('should return values prefixed with `/`', async () => {
      // When
      const changes = await repositoryService.getChanges('HEAD');

      // Verify
      expect(changes.length).toBeTruthy();
      changes.forEach(c => expect(c).toMatch(/^\//));
    });
  });
});
