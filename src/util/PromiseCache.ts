export class PromiseCache<T> {
  private promise?: Promise<T>;

  constructor(
    private readonly provider: () => Promise<T>
  ) { }


  get() {
    return this.promise ?? (this.promise = this.provider());
  }
}

export class PromisesCache<T, TKey extends string | symbol> {
  private readonly promises: Record<string | symbol, Promise<T>> = {};

  constructor(
    private readonly provider: (key: TKey) => Promise<T>
  ) { }


  get(key: TKey) {
    const keyOrDefault = key ?? '$default';

    return this.promises[keyOrDefault] ?? (this.promises[keyOrDefault] = this.provider(key as TKey));
  }
}