import { describe, expect, it } from 'vitest';

import { createRequestFingerprint } from '../../src/application/request-fingerprint.js';

describe('T-008 canonical request fingerprint', () => {
  it('produces the same SHA-256 identity regardless of field insertion order', () => {
    const first = createRequestFingerprint('PAYMENT', {
      sale_id: 'sale-1',
      payment_method: 'CASH',
      amount_received: 100,
    });
    const second = createRequestFingerprint('PAYMENT', {
      amount_received: 100,
      payment_method: 'CASH',
      sale_id: 'sale-1',
    });

    expect(first).toMatch(/^[0-9a-f]{64}$/u);
    expect(second).toBe(first);
  });

  it('changes identity when the operation or a logical request field changes', () => {
    const original = createRequestFingerprint('PAYMENT', {
      sale_id: 'sale-1',
      payment_method: 'CASH',
      amount_received: 100,
    });

    expect(
      createRequestFingerprint('PAYMENT', {
        sale_id: 'sale-1',
        payment_method: 'CASH',
        amount_received: 101,
      }),
    ).not.toBe(original);
    expect(
      createRequestFingerprint('CANCEL', {
        sale_id: 'sale-1',
        payment_method: 'CASH',
        amount_received: 100,
      }),
    ).not.toBe(original);
  });
});
