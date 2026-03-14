import { fs } from 'memfs';

import * as promises from './fs/promises';

module.exports = {
  ...fs,
  promises
};
