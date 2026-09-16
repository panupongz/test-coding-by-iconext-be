import { createHash } from 'node:crypto';

type RequestIdentityValue = string | number | boolean | null;

export type RequestIdentity = Readonly<
  Record<string, RequestIdentityValue>
>;

const canonicalize = (value: RequestIdentity): string =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(value).sort(([leftKey], [rightKey]) =>
        leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0,
      ),
    ),
  );

export const createRequestFingerprint = (
  operation: string,
  requestIdentity: RequestIdentity,
): string =>
  createHash('sha256')
    .update(canonicalize({ ...requestIdentity, operation }))
    .digest('hex');
