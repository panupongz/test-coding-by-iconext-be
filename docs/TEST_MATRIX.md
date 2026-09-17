# Backend Test Trace Matrix

This matrix is the T-009 execution map. Requirement ownership for active Q001–Q149 is defined in `IMPLEMENTATION_CHECKLIST.md`; the rows below trace every required test from T-001 through T-008 to executable evidence. Superseded D01–D12 behavior is intentionally excluded.

## Foundation, schema, and seed

| Test cases | Executable evidence | Expected HTTP/body/database/environment state |
| --- | --- | --- |
| TC-001.1–TC-001.3 | `tests/integration/http-foundation.test.ts`, HTTP unit tests | Only the three action routes exist; no auth is required; unexpected errors return sanitized Thai `500` envelopes. |
| TC-001.4–TC-001.6 | `npm run test:docker` | Compose has only `backend`/`mysql`, MySQL 8.x becomes healthy, backend uses host `mysql`, stays unready while DB is withheld, then recovers and becomes healthy. |
| TC-001.7 | `tests/unit/environment.test.ts`, tracked `.gitignore`/`.dockerignore` | Configuration is environment-driven, required values fail fast, and real `.env` files are excluded. |
| TC-002.1 | `tests/integration/database-schema.test.ts`, `npm run test:docker` | Empty MySQL migration creates exact tables, columns, types, indexes, checks, and foreign keys. |
| TC-002.2–TC-002.5 | `tests/integration/database-schema.test.ts` | Duplicate unique values, orphans, invalid statuses/quantities/payment shapes are rejected; only Product has `deleted_at`; Sale status is the TECH01 enum. |
| TC-002.6–TC-002.9 | `npm run test:docker` | Health gates DB operations; migration/seed run inside backend; an inserted sentinel survives MySQL container recreation with the named volume. |
| TC-003.1–TC-003.4 | `tests/integration/product-seed.test.ts` | Exactly P001–P005 are inserted with canonical fields, positive integer THB prices and relative images; rerun is a no-op; conflicts rollback. |
| TC-003.5 | `npm run test:docker` | Seed runs twice inside backend and retains exactly the five canonical rows. |

## Create Sale

| Test cases | Executable evidence | Expected HTTP/body/database state |
| --- | --- | --- |
| TC-004.1 | `tests/unit/create-sale-http.test.ts`, `tests/integration/create-sale.test.ts` | First request returns `201` with the exact Sale body; one `PENDING` Sale has quantity 1, snapshot price, and five-minute expiry. |
| TC-004.2 | `tests/unit/create-sale-http.test.ts`, `tests/integration/create-sale.test.ts`, `tests/integration/validation-errors.test.ts` | Invalid/missing/extra/malformed inputs and invalid keys return approved `400`/`404` errors and create no Sale. |
| TC-004.3–TC-004.5 | `tests/integration/create-sale.test.ts` | New key creates a new Sale; different request conflicts; same request replays with `200` and current `PAID`/`CANCELLED` state. |
| TC-004.4 | `tests/integration/create-sale.test.ts`, `tests/support/database-lock-wait.ts` | MySQL-observed overlapping same-key calls create one Sale and both receive its result. |
| TC-004.6 | `tests/integration/create-sale.test.ts` | Injected write failures rollback Sale/idempotency success, persist separate `FAILED`, and retry returns `409`. |

## Payment

| Test cases | Executable evidence | Expected HTTP/body/database state |
| --- | --- | --- |
| TC-005.1–TC-005.2 | `tests/unit/business-rules.test.ts`, `tests/integration/payment.test.ts` | CASH exact/overpayment returns `201` with integer change; QR exact returns `201` without `change`; one Payment and `PAID` Sale commit. |
| TC-005.3–TC-005.4 | `tests/unit/payment-http.test.ts`, `tests/integration/payment.test.ts`, `tests/integration/validation-errors.test.ts` | Invalid amount/method/body returns `400`; invalid/missing Sale returns `404`; unrelated terminal Sale returns `409`; state is unchanged. |
| TC-005.5 | `tests/unit/business-rules.test.ts`, `tests/integration/payment.test.ts` | Expiry is inclusive at the boundary and rechecked under lock; expired Sale persists `CANCELLED`, returns `200`, and creates no Payment. |
| TC-005.6 | `tests/integration/payment.test.ts`, `tests/support/database-lock-wait.ts` | MySQL-observed concurrent payments yield at most one `201`, one Payment row, and a losing conflict. |
| TC-005.7 | `tests/integration/payment.test.ts` | Same successful request replays `200`; changed request and failed-key retry return `409`. |
| TC-005.8 | `tests/integration/payment.test.ts` | Failures at Payment/Sale/idempotency boundaries rollback all business writes, persist separate `FAILED`, and make retry conflict. |

## Cancel and expiration

| Test cases | Executable evidence | Expected HTTP/body/database state |
| --- | --- | --- |
| TC-006.1–TC-006.3 | `tests/unit/cancel-sale-http.test.ts`, `tests/integration/cancel-sale.test.ts` | Pending/expired Sales persist `CANCELLED` and return exact `200` body; paid Sale returns `409` unchanged. |
| TC-006.4 | `tests/integration/cancel-sale.test.ts` | Successful same request and a new key on cancelled Sale return `200`; same key for another Sale returns `409`. |
| TC-006.5–TC-006.6 | `tests/unit/cancel-sale-http.test.ts`, `tests/integration/validation-errors.test.ts` | Any JSON body returns `400`; invalid and missing UUID Sales return TECH03 `404 SALE_NOT_FOUND`. |
| TC-006.7 | `tests/integration/cancel-sale.test.ts` | Injected transition/idempotency failures rollback, persist separate `FAILED`, and retry returns `409`. |

## Validation, errors, and integrity

| Test cases | Executable evidence | Expected HTTP/body/database state |
| --- | --- | --- |
| TC-007.1–TC-007.4 | HTTP unit tests, `tests/integration/validation-errors.test.ts` | Strict validation and business conflicts use the common envelope with approved statuses/codes, including TECH02 and TECH03. |
| TC-007.5–TC-007.7 | `tests/integration/http-foundation.test.ts`, `tests/integration/validation-errors.test.ts` | Unexpected errors are sanitized; TECH04 is exact; every public error has a non-empty Thai message and exposes no internals. |
| TC-008.1–TC-008.2 | Create/Payment/Cancel integration suites | Every injected transaction failure leaves no partial business write; `FAILED` commits only in a separate transaction and retry returns `409`. |
| TC-008.3 | `tests/integration/database-schema.test.ts` | MySQL rejects duplicate Product code, Payment Sale, idempotency key, and every tested orphan FK. |
| TC-008.4 | all three API integration suites, `tests/support/database-lock-wait.ts` | Database-observed same-key overlap executes once and returns the final replay result; changed request returns `409`. |
| TC-008.5 | `tests/integration/payment.test.ts`, `tests/support/database-lock-wait.ts` | Database-observed different-key Payment overlap creates one Payment; unique `payments.sale_id` remains the final guard. |

## T-009 decision assertions

| Decision | Executable evidence |
| --- | --- |
| TECH01 | `tests/integration/database-schema.test.ts` asserts the exact Sale enum column and rejected invalid state. |
| TECH02 | `tests/unit/payment-http.test.ts` and `tests/integration/payment.test.ts` assert first `201`, replay `200`. |
| TECH03 | `tests/unit/cancel-sale-http.test.ts` and `tests/integration/validation-errors.test.ts` assert invalid/missing Sale as `404 SALE_NOT_FOUND`. |
| TECH04 | `tests/integration/validation-errors.test.ts` asserts the exact fixed enum and Thai message catalog. |
| RC01–RC04 | Three API integration suites cover success replay, changed-request conflict, separate `FAILED`, and failed retry. |
| RU01–RU08 | API, seed, and schema integration suites cover persisted expiration, statuses/bodies, exact seed, `deleted_at`, and relative images. |
