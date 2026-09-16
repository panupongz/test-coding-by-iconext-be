import { createHash } from 'node:crypto';

import type { Knex } from 'knex';

const MAX_PROCESS_LIST_ATTEMPTS = 200;

interface ProcessListRow {
  readonly State: string;
  readonly Info: string | null;
}

const waitForProcess = async (
  database: Knex,
  matches: (row: ProcessListRow) => boolean,
  description: string,
): Promise<void> => {
  let lastRows: ProcessListRow[] = [];

  for (let attempt = 0; attempt < MAX_PROCESS_LIST_ATTEMPTS; attempt += 1) {
    const [rows] = (await database.raw('SHOW FULL PROCESSLIST')) as [
      ProcessListRow[],
    ];
    lastRows = rows;

    if (rows.some(matches)) {
      return;
    }

    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  throw new Error(
    `Did not observe ${description}. Last process list: ${JSON.stringify(lastRows)}`,
  );
};

export const waitForAdvisoryLockWait = async (
  database: Knex,
  idempotencyKey: string,
): Promise<void> => {
  const lockName = createHash('sha256')
    .update(`idempotency:${idempotencyKey}`)
    .digest('hex');

  await waitForProcess(
    database,
    ({ State, Info }) =>
      State === 'User lock' && Info?.includes(lockName) === true,
    `an advisory-lock wait for ${lockName}`,
  );
};

export const waitForSaleRowLockWait = async (
  database: Knex,
  saleId: string,
): Promise<void> =>
  waitForProcess(
    database,
    ({ Info }) =>
      Info?.toLowerCase().includes('for update') === true &&
      Info.includes(saleId),
    `a Sale row-lock wait for ${saleId}`,
  );
