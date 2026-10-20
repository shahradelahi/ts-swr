export interface SWRStoreAdapter {
  get(key: string): any | Promise<any>;
  set(key: string, value: any): void | Promise<void>;
  delete(key: string): void | Promise<void>;
  clear(): void | Promise<void>;
  keys(): Iterable<string> | AsyncIterable<string>;
}

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  expiresAt?: number;
  checksum: string | number;
}

export interface SWROptions {
  staleTimeMs?: number;
  expireTimeMs?: number;
  store?: SWRStoreAdapter;
  retries?: number;
  retryBackoff?: (attempt: number) => number;
  hasher?: (value: unknown) => string | number;
}

export type RevalidateEventPayload = {
  key: string;
  data: unknown;
  checksum: string | number;
};

export type ErrorEventPayload = {
  key: string;
  error: unknown;
};

export type SWRGlobalEvents = {
  revalidate: (payload: RevalidateEventPayload) => void;
  error: (payload: ErrorEventPayload) => void;
};
