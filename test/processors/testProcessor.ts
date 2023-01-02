import { Project } from '../../src/models/Project';
import { ProjectProcessor } from '../../src/processors';

export async function testProcessor(processor: ProjectProcessor, ...projects: Project[]) {
  const results: Project[] = [];

  for await (const result of processor.processProjects(asIterator(projects))) {
    results.push(result);
  }

  return results;
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

export async function* asIterator(projects: Project[]) {
  for (const project of projects) {
    yield project;
  }
}