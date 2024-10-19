import { PathStatus, pathStatusPriority } from '../../src/models/PathStatus';

describe(pathStatusPriority, () => {
  test.each([
    { statuses: [], expected: PathStatus.Staged },
    { statuses: [PathStatus.Staged], expected: PathStatus.Staged },
    { statuses: [PathStatus.Unstaged], expected: PathStatus.Unstaged },
    { statuses: [PathStatus.Untracked], expected: PathStatus.Untracked },

    { statuses: [PathStatus.Staged, PathStatus.Untracked], expected: PathStatus.Untracked },
    { statuses: [PathStatus.Unstaged, PathStatus.Untracked], expected: PathStatus.Untracked },
    { statuses: [PathStatus.Staged, PathStatus.Unstaged, PathStatus.Untracked], expected: PathStatus.Untracked },

    { statuses: [PathStatus.Staged, PathStatus.Unstaged], expected: PathStatus.Unstaged },
  ])('should choose $expected given $statuses', ({ statuses, expected }) => {
    // When
    const result = pathStatusPriority(...statuses);

    // Verify
    expect(result).toBe(expected);
  });
});