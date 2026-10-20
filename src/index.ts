import { SWRError } from './errors';
import { defaultHasher, MemoryStore } from './store';
import type {
  CacheEntry,
  ErrorEventPayload,
  RevalidateEventPayload,
  SWROptions,
  SWRStoreAdapter,
} from './typings';

export class SWR {
  #store: SWRStoreAdapter;
  #listeners = new Map<string, Set<(data: any, checksum: string | number) => void>>();
  #globalListeners = new Map<string, Set<(payload: any) => void>>();
  #inFlight = new Map<string, Promise<any>>();
  #options: Required<SWROptions>;

  constructor(options: SWROptions = {}) {
    this.#options = {
      staleTimeMs: options.staleTimeMs ?? 5000,
      expireTimeMs: options.expireTimeMs ?? Infinity,
      store: options.store ?? new MemoryStore(),
      retries: options.retries ?? 0,
      retryBackoff: options.retryBackoff ?? ((attempt) => Math.pow(2, attempt) * 1000),
      hasher: options.hasher ?? defaultHasher,
    };
    this.#store = this.#options.store;
  }

  async resolve<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const raw = await this.#store.get(key);
    const cached = raw as CacheEntry<T> | undefined;

    if (cached) {
      if (this.#isStaleOrExpired(cached)) {
        this.#revalidateBackground<T>(key, fetcher, cached.checksum).catch(() => {});
      }
      return cached.data;
    }

    return this.#executeInFlight<T>(key, fetcher);
  }

  async mutate<T>(key: string, data: T | ((current: T | undefined) => T)): Promise<void> {
    const raw = await this.#store.get(key);
    const cached = raw as CacheEntry<T> | undefined;
    const current = cached?.data;

    const nextData =
      typeof data === 'function' ? (data as (curr: T | undefined) => T)(current) : data;
    const checksum = this.#options.hasher(nextData);

    await this.#setEntry(key, nextData, checksum);
    this.#notifySubscribers(key, nextData, checksum);
  }

  subscribe<T>(key: string, callback: (data: T, checksum: string | number) => void): () => void {
    if (!this.#listeners.has(key)) {
      this.#listeners.set(key, new Set());
    }
    this.#listeners.get(key)!.add(callback);

    return () => {
      const set = this.#listeners.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.#listeners.delete(key);
        }
      }
    };
  }

  on(event: 'revalidate' | 'error', callback: (payload: any) => void): () => void {
    if (!this.#globalListeners.has(event)) {
      this.#globalListeners.set(event, new Set());
    }
    this.#globalListeners.get(event)!.add(callback);

    return () => {
      const set = this.#globalListeners.get(event);
      if (set) {
        set.delete(callback);
      }
    };
  }

  async clear(): Promise<void> {
    await this.#store.clear();
    this.#inFlight.clear();
  }

  async delete(key: string): Promise<void> {
    await this.#store.delete(key);
    this.#inFlight.delete(key);
  }

  #isStaleOrExpired(cached: CacheEntry): boolean {
    const now = Date.now();
    if (cached.expiresAt && now > cached.expiresAt) {
      return true;
    }
    if (now - cached.timestamp >= this.#options.staleTimeMs) {
      return true;
    }
    return false;
  }

  async #executeInFlight<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.#inFlight.has(key)) {
      return this.#inFlight.get(key)!;
    }

    const promise = (async () => {
      try {
        let attempt = 0;
        let data: T | undefined;

        while (attempt <= this.#options.retries) {
          try {
            data = await fetcher();
            break;
          } catch (err) {
            if (attempt >= this.#options.retries) {
              throw err;
            }
            const backoff = this.#options.retryBackoff(attempt);
            await new Promise((resolve) => setTimeout(resolve, backoff));
            attempt++;
          }
        }

        const checksum = this.#options.hasher(data);
        await this.#setEntry(key, data!, checksum);
        this.#notifySubscribers(key, data!, checksum);
        return data!;
      } catch (err) {
        this.#emitGlobal('error', { key, error: err });
        throw err;
      } finally {
        this.#inFlight.delete(key);
      }
    })();

    this.#inFlight.set(key, promise);
    return promise;
  }

  async #revalidateBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    oldChecksum: string | number
  ): Promise<void> {
    try {
      const freshData = await this.#executeInFlight(key, fetcher);
      const newChecksum = this.#options.hasher(freshData);

      if (newChecksum !== oldChecksum) {
        await this.#setEntry(key, freshData, newChecksum);
        this.#notifySubscribers(key, freshData, newChecksum);
      }
    } catch (err) {
      this.#emitGlobal('error', { key, error: err });
    }
  }

  async #setEntry(key: string, data: unknown, checksum: string | number): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiresAt:
        this.#options.expireTimeMs === Infinity ? undefined : now + this.#options.expireTimeMs,
      checksum,
    };
    await this.#store.set(key, entry);
  }

  #notifySubscribers(key: string, data: unknown, checksum: string | number): void {
    const set = this.#listeners.get(key);
    if (set) {
      for (const cb of set) {
        cb(data, checksum);
      }
    }
    this.#emitGlobal('revalidate', { key, data, checksum });
  }

  #emitGlobal(event: string, payload: RevalidateEventPayload | ErrorEventPayload): void {
    const set = this.#globalListeners.get(event);
    if (set) {
      for (const cb of set) {
        cb(payload);
      }
    }
  }
}

export { SWRError };
export type { SWRStoreAdapter, SWROptions };
