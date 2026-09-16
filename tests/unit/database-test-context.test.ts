import { describe, expect, it } from 'vitest';

import { isDisposableDatabaseTestContext } from '../support/database-test-context.js';

describe('isDisposableDatabaseTestContext', () => {
  it('accepts only an explicit disposable test context', () => {
    expect(
      isDisposableDatabaseTestContext({
        NODE_ENV: 'test',
        DB_TEST_CONTEXT: 'disposable',
      }),
    ).toBe(true);
  });

  it.each([
    { NODE_ENV: 'development', DB_TEST_CONTEXT: 'disposable' },
    { NODE_ENV: 'production', DB_TEST_CONTEXT: 'disposable' },
    { NODE_ENV: 'test' },
    { NODE_ENV: 'test', DB_TEST_CONTEXT: 'development' },
  ])('rejects a non-disposable context: %o', (environment) => {
    expect(isDisposableDatabaseTestContext(environment)).toBe(false);
  });
});
