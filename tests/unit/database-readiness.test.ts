import { describe, expect, it, vi } from 'vitest';

import { waitForDatabase } from '../../src/database/readiness.js';
import { createLogger } from '../../src/infrastructure/logger.js';

describe('waitForDatabase', () => {
  it('retries until the database accepts a connection', async () => {
    const probe = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('not ready'))
      .mockRejectedValueOnce(new Error('not ready'))
      .mockResolvedValue(undefined);
    const sleep = vi.fn<(milliseconds: number) => Promise<void>>().mockResolvedValue(undefined);

    await waitForDatabase(
      probe,
      { maxAttempts: 3, retryDelayMs: 25 },
      createLogger('silent'),
      sleep,
    );

    expect(probe).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(25);
  });

  it('fails after the configured maximum without exposing the connection error', async () => {
    const probe = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('secret database detail'));
    const sleep = vi.fn<(milliseconds: number) => Promise<void>>().mockResolvedValue(undefined);

    await expect(
      waitForDatabase(
        probe,
        { maxAttempts: 2, retryDelayMs: 0 },
        createLogger('silent'),
        sleep,
      ),
    ).rejects.not.toThrow('secret database detail');
    expect(probe).toHaveBeenCalledTimes(2);
  });
});
