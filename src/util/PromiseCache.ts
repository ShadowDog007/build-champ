export type CacheProvider<T, K extends string | symbol | undefined = undefined>
  = K extends string | symbol
    ? ((key: K) => Promise<T>)
    : (() => Promise<T>);

export class PromiseCache<T, K extends string | symbol | undefined = undefined> {
  private static readonly defaultKey = Symbol.for('$default');
  private readonly promises: Partial<Record<string | symbol, Promise<T>>> = {};

  constructor(
    private readonly provider: CacheProvider<T, K>
  ) { }

  get(key?: K): Promise<T> {
    const keyOrDefault = key ?? PromiseCache.defaultKey;

    return this.promises[keyOrDefault] ?? (this.promises[keyOrDefault] = this.provider(key as never));
  }
}
