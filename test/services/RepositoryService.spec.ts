import { Container, injectable } from 'inversify';
import { containerModule } from '../../src/containerModule';
import { RepositoryService, RepositoryServiceImpl } from '../../src/services/RepositoryService';
import { TYPES } from '../../src/TYPES';
import { SpawnServiceImpl } from '../../src/services/SpawnService';
import { SpawnOptionsWithoutStdio, ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { PathStatus } from '../../src/models/PathStatus';

describe(RepositoryServiceImpl, () => {
  let container: Container;
  let mockSpawnService: MockSpawnService;
  let repositoryService: RepositoryService;

  @injectable()
  class MockSpawnService extends SpawnServiceImpl {
    readonly spawns: { command: string, args: ReadonlyArray<string>, options: SpawnOptionsWithoutStdio; }[] = [];

    private readonly outputs: ReadonlyArray<string>[] = [];

    addRunOutput(...lines: string[]) {
      this.outputs.push(lines);
    }

    spawn(command: string, args: readonly string[], options: SpawnOptionsWithoutStdio): ChildProcessWithoutNullStreams {
      this.spawns.push({ command, args, options });

      const output = this.outputs.shift();

      if (!output) {
        throw new Error('Define output via \.addRunOutput');
      }

      const echoCmd = output.map(l => `echo ${l}`).join(' && ');

      const [shellCommand, shellOptions]: [string, string[]] = process.platform === 'win32'
        ? ['cmd', ['/c']]
        : ['sh', ['-c']];


      const echo = spawn(shellCommand, [...shellOptions, echoCmd], options);
      return echo;
    }
  }

  beforeEach(async () => {
    container = new Container();
    container.load(containerModule);
    container.rebind(TYPES.SpawnService).to(MockSpawnService).inSingletonScope();
    mockSpawnService = container.get(TYPES.SpawnService);
    repositoryService = container.get(TYPES.RepositoryService);
  });

  describe(RepositoryServiceImpl.prototype.getLatestPathVersion, () => {
    test('when base path provided should return latest version', async () => {
      // Given
      mockSpawnService.addRunOutput();
      mockSpawnService.addRunOutput(`{'hash':'long-hash','hashShort':'short-hash','timestamp':'2024-10-19T00:00:00Z'}`);

      // When
      const version = await repositoryService.getLatestPathVersion('/');

      // Verify
      expect(version).toMatchObject({
        hash: 'long-hash',
        hashShort: 'short-hash',
      });
    });

    test.each([
      { path: '/', expected: '.' },
      { path: '/file1.txt', expected: 'file1.txt' },
    ])('should format paths in command correctly ($path => $expected)', async ({ path, expected }) => {
      // Given
      mockSpawnService.addRunOutput();
      mockSpawnService.addRunOutput(`{'hash':'long-hash','hashShort':'short-hash','timestamp':'2024-10-19T00:00:00Z'}`);

      // When
      await repositoryService.getLatestPathVersion(path);

      // Verify
      expect(mockSpawnService.spawns[1].command).toBe('git');
      expect(mockSpawnService.spawns[1].args.slice(0, 3)).toMatchObject([
        'log', '-n', '1'
      ]);
      expect(mockSpawnService.spawns[1].args.slice(4)).toMatchObject([
        '--',
        expected
      ]);
    });

    test.each([
      { status: 'M ', expected: PathStatus.Staged },
      { status: ' M', expected: PathStatus.Unstaged },
      { status: 'MM', expected: PathStatus.Unstaged },
      { status: '??', expected: PathStatus.Untracked },
    ])('when base path has any uncommitted changed with status $status', async ({ status, expected }) => {
      // Given
      mockSpawnService.addRunOutput(`${status} file.txt`);
      mockSpawnService.addRunOutput(`{'hash':'long-hash','hashShort':'short-hash','timestamp':'2024-10-19T00:00:00Z'}`);

      // When
      const version = await repositoryService.getLatestPathVersion('/');

      // Verify
      expect(version).toMatchObject({
        hash: expected,
        hashShort: expected,
      });
    });

    test('when file does not match uncommitted change, should use hash', async () => {
      // Given
      mockSpawnService.addRunOutput(`?? file.txt`);
      mockSpawnService.addRunOutput(`{'hash':'long-hash','hashShort':'short-hash','timestamp':'2024-10-19T00:00:00Z'}`);

      // When
      const version = await repositoryService.getLatestPathVersion('/other.txt');

      // Verify
      expect(version).toMatchObject({
        hash: 'long-hash',
        hashShort: 'short-hash',
      });
    });

    test('when path is a child of uncommitted change, should use use uncommitted status', async () => {
      // Given
      mockSpawnService.addRunOutput(`?? some/folder/`);
      mockSpawnService.addRunOutput(`{'hash':'long-hash','hashShort':'short-hash','timestamp':'2024-10-19T00:00:00Z'}`);

      // When
      const version = await repositoryService.getLatestPathVersion('/some/folder/structure/here');

      // Verify
      expect(version).toMatchObject({
        hash: PathStatus.Untracked,
        hashShort: PathStatus.Untracked,
      });
    });

    test('when path parent of uncommitted change, should use use uncommitted status', async () => {
      // Given
      mockSpawnService.addRunOutput(`?? some/folder/file.txt`);
      mockSpawnService.addRunOutput(`{'hash':'long-hash','hashShort':'short-hash','timestamp':'2024-10-19T00:00:00Z'}`);

      // When
      const version = await repositoryService.getLatestPathVersion('/some/folder');

      // Verify
      expect(version).toMatchObject({
        hash: PathStatus.Untracked,
        hashShort: PathStatus.Untracked,
      });
    });
  });

  describe(RepositoryServiceImpl.prototype.getChanges, () => {
    test('should map all files correctly', async () => {
      // Given
      mockSpawnService.addRunOutput('file.txt', 'folder/file.txt');

      // When
      const changes = await repositoryService.getChanges('HEAD');

      // Verify
      expect(changes).toMatchObject([
        '/file.txt',
        '/folder/file.txt'
      ]);
    });

    test('should pass object parameter correctly', async () => {
      // Given
      mockSpawnService.addRunOutput();

      // When
      await repositoryService.getChanges('HEAD');

      // Verify
      expect(mockSpawnService.spawns[0].args).toMatchObject([
        'diff-tree', '--no-commit-id', '--name-only', '-r',
        'HEAD'
      ]);
    });

    test('should pass object parameters correctly', async () => {
      // Given
      mockSpawnService.addRunOutput();

      // When
      await repositoryService.getChanges('HEAD~1', 'HEAD');

      // Verify
      expect(mockSpawnService.spawns[0].args).toMatchObject([
        'diff-tree', '--no-commit-id', '--name-only', '-r',
        'HEAD~1', 'HEAD'
      ]);
    });
  });
});
