import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { DateTime, Duration } from 'luxon';
import { ProjectVersion } from '../models/ProjectVersion';
import { Provider } from '../providers';
import { TYPES } from '../TYPES';
import { SpawnService } from './SpawnService';
import { SimpleGit } from 'simple-git';
import { PromiseCache } from '../util/PromiseCache';
import { createInterface } from 'readline/promises';
import { PathStatus, pathStatusPriority } from '../models/PathStatus';

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
    @inject(TYPES.GitProvider) private readonly git: Provider<SimpleGit>,
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

    gitStatus.stdout.setEncoding('utf8');
    const rl = createInterface(gitStatus.stdout);

    for await (const line of rl) {
      let status: PathStatus | undefined = undefined;
      switch (line.slice(0, 2)) {
        case 'M ':
          status = PathStatus.Staged;
          break;
        case 'MM':
        case ' M':
          status = PathStatus.Unstaged;
          break;
        case '??':
          status = PathStatus.Untracked;
          break;
      }

      if (!status) {
        continue;
      }

      changes.push({
        path: `/${line.slice(3)}`,
        status,
      });
    }

    await new Promise((resolve, reject) => gitStatus.on('close', code => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error('Failed executing git status, exited with code ' + code));
      }
    }));

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
      `--format=format:{'hash':'%H', 'hashShort':'%h', 'timestamp':'%cI'}`,
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

    gitLog.stdout.setEncoding('utf8');
    const rl = createInterface(gitLog.stdout);
    for await (const line of rl) {
      log = JSON.parse(line.replaceAll('\'', '"'));
      break;
    }

    await new Promise((resolve, reject) => gitLog.on('close', code => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error('Failed executing git log, exited with code ' + code));
      }
    }));

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
    const git = await this.git.get();
    const args = objectishTo === undefined ? [objectishFrom] : [objectishFrom, objectishTo];
    const diff = await git.diffSummary(args);

    return diff.files.map(f => `/${f.file}`);
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