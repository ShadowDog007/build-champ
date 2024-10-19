import { fs } from 'memfs';
import { dirname, join } from 'path';

import * as promises from './fs/promises';

const fsReal = jest.requireActual('fs') as typeof fs;
const copyFiles = [
  'node_modules/vm2/lib/bridge.js',
  'node_modules/vm2/lib/setup-sandbox.js',
];

for (const file of copyFiles) {
  const path = join(process.cwd(), file);
  const content = fsReal.readFileSync(path, 'utf8');
  fs.mkdirSync(dirname(path), { recursive: true });
  fs.writeFileSync(path, content);
}

module.exports = {
  ...fs,
  promises
};
