import { baseDir } from '../mocks';

let currentDir = baseDir;

export function cwd() {
  return currentDir;
}

export function chdir(dir: string) {
  currentDir = dir;
}

export const platform = jest.requireActual('process').platform;