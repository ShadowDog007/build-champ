/**
 * List of statuses for uncommited files
 */
export enum PathStatus {
  Staged = 'staged',
  Unstaged = 'unstaged',
  Untracked = 'untracked',
}

export function pathStatusPriority(...statuses: PathStatus[]) {
  let highestStatus = PathStatus.Staged;

  for (const status of statuses) {
    switch (status) {
      case PathStatus.Untracked:
        return PathStatus.Untracked;
      case PathStatus.Unstaged:
        if (highestStatus === PathStatus.Staged)
          highestStatus = PathStatus.Unstaged;
        break;
    }
  }

  return highestStatus;
}