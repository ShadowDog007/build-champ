jest.mock('fs');
jest.mock('fs/promises');

import { ChildProcessWithoutNullStreams, spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { Container, injectable } from 'inversify';
import { cloneDeep, uniq } from 'lodash';
import { fs } from 'memfs';
import { resolve } from 'path';
import 'reflect-metadata';
import { containerModule } from '../src/containerModule';
import { Project, ProjectWithVersion } from '../src/models/Project';
import { ProjectVersion } from '../src/models/ProjectVersion';
import { loadPluginModules } from '../src/plugins';
import { Provider } from '../src/providers';
import { GlobServiceImpl } from '../src/services/GlobService';
import { ProjectService } from '../src/services/ProjectService';
import { RepositoryService } from '../src/services/RepositoryService';
import { SpawnService } from '../src/services/SpawnService';
import { TYPES } from '../src/TYPES';

export async function createContainer() {
  const container = new Container();
  container.load(containerModule);
  container.rebind(TYPES.BaseDirProvider).toConstantValue(new MockProvider(Promise.resolve('/')));

  await loadPluginModules(container);
  container.snapshot();
  return container;
}

export async function resetFs() {
  const toDelete = (await GlobServiceImpl.globAsync('**/*', { cwd: '/', dot: true }))
    .map(p => resolve('/', p))
    .map(p => [p, fs.statSync(p).isDirectory()] as [string, boolean]);

  const files = toDelete.filter(f => !f[1]).map(f => f[0]);
  const dirs = toDelete.filter(f => f[1]).map(f => f[0]);

  for (const file of files) {
    fs.unlinkSync(file);
  }
  for (const dir of dirs.reverse()) {
    fs.rmdirSync(dir);
  }
  fs.mkdirSync('/.git');
}

export function createDefaultProject(dir: string): Project {
  return {
    name: '',
    dir,
    dependencies: [],
    commands: {},
    tags: [],
  };
}

@injectable()
export class MockProvider<T> extends Provider<T> {
  constructor(public value: Promise<T>) {
    super();
  }

  protected provider(): Promise<T> {
    return this.value;
  }

  get(): Promise<T> {
    return this.value;
  }

}

@injectable()
export class MockProjectService implements ProjectService {
  private readonly projects: ProjectWithVersion[] = [];

  addProject(project: ProjectWithVersion) {
    this.addProjects(project);
  }

  addProjects(...projects: ProjectWithVersion[]) {
    this.projects.push(...cloneDeep(projects));
    this.projects.sort((a, b) => a.dir.localeCompare(b.dir));
  }

  async getProjects(): Promise<Project[]> {
    return this.projects;
  }
  async getProjectsWithVersions(): Promise<ProjectWithVersion[]> {
    return this.projects;
  }
  async getProjectVersion(project: Project): Promise<ProjectVersion> {
    return (project as ProjectWithVersion).version;
  }
}

export interface MockCommit {
  hash: string;
  hashShort: string;
  timestamp: Date;
  files: string[];
}

@injectable()
export class MockRepositoryService implements RepositoryService {
  readonly commits: MockCommit[] = [];

  addCommitChanges(commit: Omit<MockCommit, 'hashShort'>) {
    this.commits.push({ ...commit, hashShort: commit.hash.substring(0, 8) });
    this.commits.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getPathVersion(path: string): Promise<ProjectVersion> {
    const commit = this.commits.find(c => c.files.some(f => f.startsWith(path)));
    return commit || { hash: 'uncommitted', hashShort: 'uncommitted', timestamp: new Date() };
  }
  async getLatestPathVersion(...paths: string[]): Promise<ProjectVersion> {
    const versions = await Promise.all(paths.map((p) => this.getPathVersion(p)));
    const sortedVersions = versions.sort((a, b) => b.timestamp.getDate() - a.timestamp.getDate());

    return sortedVersions.find(v => v.hash !== 'uncommitted') || sortedVersions[0];
  }

  getChanges(objectish: string): Promise<string[]>;
  getChanges(objectishFrom: string, objectishTo: string): Promise<string[]>;
  async getChanges(objectishFrom: unknown, objectishTo?: unknown): Promise<string[]> {
    const fromIndex = this.commits.findIndex(c => c.hash === objectishFrom);
    const toIndex = objectishTo ? this.commits.findIndex(c => c.hash === objectishTo) : 0;

    return uniq(this.commits.flatMap((v, i) => toIndex <= i && i <= fromIndex ? v.files : []));
  }
}

@injectable()
export class MockSpawnService implements SpawnService {
  spawn(command: string, args: readonly string[], options: SpawnOptionsWithoutStdio): ChildProcessWithoutNullStreams {
    return spawn(command, args, {
      ...options,
      cwd: undefined, // These directories won't exist
    });
  }
}
