import type { SWRStoreAdapter } from './typings';

export class MemoryStore implements SWRStoreAdapter {
  #store = new Map<string, any>();

  get(key: string): any {
    return this.#store.get(key);
  }

  set(key: string, value: any): void {
    this.#store.set(key, value);
  }

  delete(key: string): void {
    this.#store.delete(key);
  }

  clear(): void {
    this.#store.clear();
  }

  keys(): Iterable<string> {
    return this.#store.keys();
  }
}

export function defaultHasher(value: unknown): string | number {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return JSON.stringify(value, (_, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.keys(v)
          .sort()
          .reduce(
            (acc, key) => {
              acc[key] = (v as Record<string, unknown>)[key];
              return acc;
            },
            {} as Record<string, unknown>
          )
      : v
  );
}
