import { createHash } from 'node:crypto';

import type { Knex } from 'knex';

const WAIT_FOR_LOCK_WITHOUT_TIMEOUT = -1;

interface NamedLockRow {
  readonly acquired: number;
}

interface ConnectionPoolClient {
  acquireConnection(): Promise<unknown>;
  releaseConnection(connection: unknown): Promise<void>;
}

export const withIdempotencyKeyLock = async <Result>(
  database: Knex,
  idempotencyKey: string,
  executeWhileLocked: (connection: unknown) => Promise<Result>,
): Promise<Result> => {
  const lockName = createHash('sha256')
    .update(`idempotency:${idempotencyKey}`)
    .digest('hex');
  const poolClient = database.client as unknown as ConnectionPoolClient;
  const connection = await poolClient.acquireConnection();

  try {
    const lockResult = (await database
      .raw('SELECT GET_LOCK(?, ?) AS acquired', [
        lockName,
        WAIT_FOR_LOCK_WITHOUT_TIMEOUT,
      ])
      .connection(connection)) as unknown as [NamedLockRow[]];

    if (lockResult[0][0]?.acquired !== 1) {
      throw new Error('Could not acquire the idempotency key lock');
    }

    return await executeWhileLocked(connection);
  } finally {
    try {
      await database
        .raw('SELECT RELEASE_LOCK(?)', [lockName])
        .connection(connection);
    } finally {
      await poolClient.releaseConnection(connection);
    }
  }
};
