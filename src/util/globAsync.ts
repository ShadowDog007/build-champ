import glob, { IOptions } from 'glob';

export async function globAsync(pattern: string, options: Pick<IOptions, 'cwd' | 'dot' | 'nocase'>) {
  return new Promise<string[]>(
    (resolve, error) =>
      glob(pattern, options,
        (err, matches) => err ? error(err) : resolve(matches)));
}
