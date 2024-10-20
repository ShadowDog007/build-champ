import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { DateTime, Duration } from 'luxon';
import { ProjectVersion } from '../models/ProjectVersion';
import { Provider } from '../providers';
import { TYPES } from '../TYPES';
import { SpawnService } from './SpawnService';
import { PromiseCache } from '../util/PromiseCache';
import { PathStatus, pathStatusPriority } from '../models/PathStatus';
import { StreamHelpers } from '../util/StreamHelpers';

export interface RepositoryService {
  /**
   * Gets the most recent version from the provided paths
   * @param paths The paths to check
   */
  getLatestPathVersion(...paths: string[]): Promise<ProjectVersion>;

  /**
   * Collects all the changes from the provided object
   * @param objectish
   */
  getChanges(objectish: string): Promise<string[]>;

  /**
   * Collects all changes between the the provided objects
   * @param objectishFrom
   * @param objectishTo
   */
  getChanges(objectishFrom: string, objectishTo: string): Promise<string[]>;
}

@injectable()
export class RepositoryServiceImpl implements RepositoryService {
  private readonly uncommitedChanges = new PromiseCache(() => this.loadUncommitedChanges());

  constructor(
    @inject(TYPES.BaseDirProvider) private readonly baseDir: Provider<string>,
    @inject(TYPES.SpawnService) private readonly spawnService: SpawnService
  ) { }

  async loadUncommitedChanges(): Promise<readonly UncommitedPath[]> {
    const gitStatus = this.spawnService.spawn('git', [
      'status', '-s', '-unormal'
    ], {
      cwd: await this.baseDir.get(),
      stdio: 'pipe',
    });

    const changes: UncommitedPath[] = [];

    for await (const line of StreamHelpers.readLines(gitStatus.stdout)) {
      const statusSlice = line.slice(0, 2);
      let status: PathStatus | undefined;
      if (statusSlice === 'M ') status = PathStatus.Staged;
      if (statusSlice === 'MM' || statusSlice == ' M') status = PathStatus.Unstaged;
      if (statusSlice === '??') status = PathStatus.Untracked;

      if (!status) {
        continue;
      }

      changes.push({
        path: `/${line.slice(3)}`,
        status,
      });
    }

    await this.spawnService.waitForCompletion(gitStatus);

    return changes;
  }

  async getLatestPathVersion(...paths: string[]): Promise<ProjectVersion> {
    const uncommitedChanges = await this.uncommitedChanges.get();

    const matchingUncommitedChanges = uncommitedChanges
      .filter(uc => !!paths.find(p =>
        uc.path.startsWith(p) || p.startsWith(uc.path))
      );

    if (matchingUncommitedChanges.length) {
      const status = pathStatusPriority(...matchingUncommitedChanges.map(c => c.status));

      return {
        hash: status,
        hashShort: status,
        timestamp: new Date(),
        ago: 'now',
        localChanges: matchingUncommitedChanges.map(c => c.path),
      };
    }

    const gitLog = this.spawnService.spawn('git', [
      'log',
      '-n', '1',
      `--format=format:{'hash':'%H','hashShort':'%h','timestamp':'%cI'}`,
      '--',
      ...paths.map(path => path.startsWith('/') ? path.slice(1) || '.' : path)
    ], {
      cwd: await this.baseDir.get(),
      stdio: 'pipe',
    });

    let log: Omit<ProjectVersion, 'ago'> = {
      hash: 'uncommitted',
      hashShort: 'uncommitted',
      timestamp: new Date(),
    };

    for await (const line of StreamHelpers.readLines(gitLog.stdout)) {
      try {
        log = JSON.parse(line.replaceAll('\'', '"'));
      } catch (error) {
        console.log(`Failed processing line: '${line}'`);
        throw error;
      }
      break;
    }

    await this.spawnService.waitForCompletion(gitLog, 'git log');

    const timestamp = new Date(log.timestamp || new Date());
    const ago = !log ? 'now' : this.calculateAgo(timestamp);
    return {
      hash: log.hash,
      hashShort: log.hashShort,
      timestamp,
      ago,
    };
  }

  async getChanges(objectish: string): Promise<string[]>;
  async getChanges(objectishFrom: string, objectishTo: string): Promise<string[]>;
  async getChanges(objectishFrom: string, objectishTo?: string): Promise<string[]> {
    const args = objectishTo === undefined ? [objectishFrom] : [objectishFrom, objectishTo];
    const gitDiff = this.spawnService.spawn('git', [
      'diff-tree', '--no-commit-id', '--name-only', '-r',
      ...args
    ], {
      cwd: await this.baseDir.get(),
      stdio: 'pipe'
    });

    const files: `/${string}`[] = [];
    for await (const file of StreamHelpers.readLines(gitDiff.stdout)) {
      files.push(`/${file.trim()}`);
    }

    await this.spawnService.waitForCompletion(gitDiff, 'git diff-tree');

    return files;
  }

  calculateAgo(timestamp: Date) {
    let duration = DateTime.fromJSDate(timestamp)
      .diffNow()
      .mapUnits(x => Math.abs(x))
      .rescale();

    const durationObj = duration.toObject();

    for (const [unit, value] of Object.entries(durationObj)) {
      // Get the highest order time
      duration = Duration.fromObject({ [unit]: value });
      break;
    }

    return `${duration.toHuman()} ago`;
  }
}

export interface UncommitedPath {
  path: `/${string}`;
  status: PathStatus;
}
