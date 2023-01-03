export interface ValueProvider<T> {
  readonly value: T;
}

export const ProviderValueTypes = {
  BaseDir: Symbol.for('BaseDir'),
  Git: Symbol.for('Git'),
  Program: Symbol.for('Program'),
};

export const ProviderTypes = {
  BaseDirProvider: Symbol.for('BaseDirProvider'),
  GitProvider: Symbol.for('GitProvider'),
  ProgramProvider: Symbol.for('ProgramProvider'),
} satisfies Record<`${keyof typeof ProviderValueTypes}Provider`, symbol>;
