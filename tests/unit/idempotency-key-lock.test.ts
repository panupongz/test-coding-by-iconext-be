import { createHash } from 'node:crypto';

import type { Knex } from 'knex';
import { describe, expect, it, vi } from 'vitest';

import { withIdempotencyKeyLock } from '../../src/application/idempotency-key-lock.js';

interface FakeDatabaseOptions {
  readonly acquired?: number;
  readonly releaseLockError?: Error;
}

const createFakeDatabase = (options: FakeDatabaseOptions = {}) => {
  const connection = {};
  const events: string[] = [];
  const releaseConnection = vi.fn((): Promise<void> => {
    events.push('release-connection');
    return Promise.resolve();
  });
  const raw = vi.fn((sql: string, bindings: readonly unknown[]) => ({
    connection: (usedConnection: unknown): Promise<unknown> => {
      expect(usedConnection).toBe(connection);

      if (sql.startsWith('SELECT GET_LOCK')) {
        events.push('acquire-lock');
        return Promise.resolve([[{ acquired: options.acquired ?? 1 }]]);
      }

      events.push('release-lock');

      if (options.releaseLockError !== undefined) {
        return Promise.reject(options.releaseLockError);
      }

      return Promise.resolve([]);
    },
    bindings,
  }));
  const database = {
    client: {
      acquireConnection: (): Promise<unknown> => {
        events.push('acquire-connection');
        return Promise.resolve(connection);
      },
      releaseConnection,
    },
    raw,
  } as unknown as Knex;

  return { database, events, raw, releaseConnection };
};

describe('withIdempotencyKeyLock', () => {
  it('runs work while holding the hashed key lock and releases resources in order', async () => {
    const { database, events, raw, releaseConnection } = createFakeDatabase();
    const idempotencyKey = 'create-sale-1';
    const expectedLockName = createHash('sha256')
      .update(`idempotency:${idempotencyKey}`)
      .digest('hex');

    const result = await withIdempotencyKeyLock(
      database,
      idempotencyKey,
      () => {
        events.push('execute');
        return Promise.resolve('result');
      },
    );

    expect(result).toBe('result');
    expect(events).toEqual([
      'acquire-connection',
      'acquire-lock',
      'execute',
      'release-lock',
      'release-connection',
    ]);
    expect(raw).toHaveBeenNthCalledWith(
      1,
      'SELECT GET_LOCK(?, ?) AS acquired',
      [expectedLockName, -1],
    );
    expect(raw).toHaveBeenNthCalledWith(
      2,
      'SELECT RELEASE_LOCK(?)',
      [expectedLockName],
    );
    expect(releaseConnection).toHaveBeenCalledOnce();
  });

  it('releases the lock and connection when locked work fails', async () => {
    const { database, events } = createFakeDatabase();

    await expect(
      withIdempotencyKeyLock(database, 'payment-1', () => {
        events.push('execute');
        return Promise.reject(new Error('workflow failed'));
      }),
    ).rejects.toThrow('workflow failed');

    expect(events).toEqual([
      'acquire-connection',
      'acquire-lock',
      'execute',
      'release-lock',
      'release-connection',
    ]);
  });

  it('does not execute work when lock acquisition is unsuccessful', async () => {
    const { database, events } = createFakeDatabase({ acquired: 0 });
    const executeWhileLocked = vi.fn((): Promise<void> => Promise.resolve());

    await expect(
      withIdempotencyKeyLock(
        database,
        'cancel-1',
        executeWhileLocked,
      ),
    ).rejects.toThrow('Could not acquire the idempotency key lock');

    expect(executeWhileLocked).not.toHaveBeenCalled();
    expect(events).toEqual([
      'acquire-connection',
      'acquire-lock',
      'release-lock',
      'release-connection',
    ]);
  });

  it('releases the connection and propagates cleanup failure when lock release fails', async () => {
    const releaseLockError = new Error('lock release failed');
    const { database, events, releaseConnection } = createFakeDatabase({
      releaseLockError,
    });

    await expect(
      withIdempotencyKeyLock(database, 'cleanup-1', () => {
        events.push('execute');
        return Promise.reject(new Error('workflow failed'));
      }),
    ).rejects.toBe(releaseLockError);

    expect(events).toEqual([
      'acquire-connection',
      'acquire-lock',
      'execute',
      'release-lock',
      'release-connection',
    ]);
    expect(releaseConnection).toHaveBeenCalledOnce();
  });
});
