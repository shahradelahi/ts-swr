import { describe, expect, test, vi } from 'vitest';

import { SWR } from './index';

describe('SWR Engine', () => {
  test('should resolve data and cache it', async () => {
    const swr = new SWR();
    const fetcher = vi.fn().mockResolvedValue('hello');

    const result1 = await swr.resolve('key1', fetcher);
    expect(result1).toBe('hello');
    expect(fetcher).toHaveBeenCalledTimes(1);

    const result2 = await swr.resolve('key1', fetcher);
    expect(result2).toBe('hello');
    expect(fetcher).toHaveBeenCalledTimes(1); // cached
  });

  test('should deduplicate concurrent requests (in-flight)', async () => {
    const swr = new SWR();
    const fetcher = vi
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('data'), 50)));

    const [res1, res2] = await Promise.all([
      swr.resolve('key-concurrent', fetcher),
      swr.resolve('key-concurrent', fetcher),
    ]);

    expect(res1).toBe('data');
    expect(res2).toBe('data');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test('should trigger background revalidation when stale', async () => {
    const swr = new SWR({ staleTimeMs: 10 });
    const fetcher = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');

    const res1 = await swr.resolve('key-stale', fetcher);
    expect(res1).toBe('v1');

    // Wait for staleTimeMs
    await new Promise((resolve) => setTimeout(resolve, 20));

    const revalidatePromise = new Promise((resolve) => {
      swr.on('revalidate', (payload: any) => {
        if (payload.key === 'key-stale') {
          resolve(payload.data);
        }
      });
    });

    const res2 = await swr.resolve('key-stale', fetcher);
    expect(res2).toBe('v1'); // immediate stale return

    const freshRes = await revalidatePromise;
    expect(freshRes).toBe('v2');
  });

  test('should support subscriptions', async () => {
    const swr = new SWR();
    const sub = vi.fn();

    const unsubscribe = swr.subscribe('key-sub', sub);

    await swr.mutate('key-sub', 'mutation-data');
    expect(sub).toHaveBeenCalledWith('mutation-data', expect.any(String));

    unsubscribe();
    await swr.mutate('key-sub', 'another-data');
    expect(sub).toHaveBeenCalledTimes(1);
  });

  test('should support retries on failure', async () => {
    const swr = new SWR({ retries: 2, retryBackoff: () => 10 });
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('success');

    const result = await swr.resolve('key-retry', fetcher);
    expect(result).toBe('success');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  test('should emit error event when all retries fail', async () => {
    const swr = new SWR({ retries: 1, retryBackoff: () => 10 });
    const fetcher = vi.fn().mockRejectedValue(new Error('permanent fail'));

    const errorListener = vi.fn();
    swr.on('error', errorListener);

    await expect(swr.resolve('key-fail', fetcher)).rejects.toThrow('permanent fail');
    expect(errorListener).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'key-fail', error: expect.any(Error) })
    );
  });

  test('should allow custom hasher', async () => {
    const hasher = vi.fn().mockReturnValue('custom-hash');
    const swr = new SWR({ hasher });

    const fetcher = vi.fn().mockResolvedValue({ a: 1 });
    await swr.resolve('key-hash', fetcher);

    expect(hasher).toHaveBeenCalledWith({ a: 1 });
  });
});
