import { inject, injectable } from 'inversify';
import 'reflect-metadata';
import { DateTime, Duration } from 'luxon';
import { ProjectVersion } from '../models/ProjectVersion';
import { Provider } from '../providers';
import { TYPES } from '../TYPES';
import { SpawnService } from './SpawnService';
import { SimpleGit } from 'simple-git';

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

  constructor(
    @inject(TYPES.BaseDirProvider) private readonly baseDir: Provider<string>,
    @inject(TYPES.GitProvider) private readonly git: Provider<SimpleGit>,
    @inject(TYPES.SpawnService) private readonly spawnService: SpawnService
  ) { }

  async getLatestPathVersion(...paths: string[]): Promise<ProjectVersion> {
    // TODO - need to consider any uncommitted changes
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
    gitLog.stdout.on('data', (line: string) => {
      log = JSON.parse(line.split('\n')[0].replaceAll('\'', '"'));
    });

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