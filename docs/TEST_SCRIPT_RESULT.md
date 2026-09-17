# Backend Test Script + Result

## 1. Purpose
This document defines the backend verification script and records execution results when evidence exists for the revision being documented. Detailed test-to-source mapping is maintained in `docs/TEST_MATRIX.md`.

## 2. Result convention

- `PASS`: recorded execution verifies the expected behavior.
- `FAIL`: recorded execution differs from the expected behavior.
- `BLOCKED`: execution was attempted but cannot complete because of an identified blocker.
- `NOT_RUN`: executable tests exist, but no execution output is recorded.

## 3. Preconditions

1. Checkout backend branch `feature/implement`.
2. Provide environment values based on `.env.example` without committing secrets.
3. Docker and Docker Compose are available for Docker-backed verification.
4. Dependencies are installed or the backend container is buildable.
5. MySQL starts healthy before database-dependent integration verification.

## 4. Final Execution Gate

The following gate was executed from `feature/implement`:

```bash
npm run typecheck
npm run lint
npm run build
npm test
npm run test:docker
```

**Tested branch:** `feature/implement`  
**Execution date:** `2026-09-18`  
**Final gate:** `PASS`

Observed results:

- `npm run typecheck`: PASS — TypeScript typecheck completed without reported errors.
- `npm run lint`: PASS — ESLint completed without reported errors.
- `npm run build`: PASS — TypeScript production build completed without reported errors.
- `npm test` on the host: PASS for all runnable tests; 12 test files passed and 5 DB-dependent integration files were skipped because the host run did not provide the disposable DB test context (90 passed, 58 skipped; 148 total tests).
- `npm run test:docker`: PASS — Docker environment verification built the backend, started MySQL, verified readiness/recovery, ran migration and seed checks, verified persistence, and executed the complete test suite in the disposable Docker environment with **17/17 test files passed and 148/148 tests passed, 0 skipped**.
- Docker verification reported: `T-009 Docker environment verification passed: config, build, readiness recovery, health, service-name networking, container migration/seed/tests, and volume persistence.`
- Verification cleanup completed by removing the temporary backend/MySQL containers, image, volume, and network.

The Docker-backed full-suite result is the authoritative integration evidence for DB-dependent cases that were intentionally skipped during the initial host-only `npm test` run.

## 5. Test Script and Result Summary

| Test ID | Requirement / Area | Script / Evidence | Expected Result | Recorded Result |
| --- | --- | --- | --- | --- |
| TC-001.1–001.7 | Foundation / runtime | HTTP foundation + environment tests + `npm run test:docker` | Only approved routes exist; sanitized errors; Compose/readiness/configuration behavior is correct. | PASS |
| TC-002.1–002.9 | Database schema | `tests/integration/database-schema.test.ts` + Docker verification | Exact schema, constraints, FK/unique/check rules, migrations and persistent volume behavior are enforced. | PASS |
| TC-003.1–003.5 | Product seed | `tests/integration/product-seed.test.ts` + Docker seed execution | Exactly P001–P005 exist; valid fields/images; rerun safe; conflict rollback. | PASS |
| TC-004.1–004.6 | Create Sale | Create Sale unit/integration suites | Valid request creates one Sale; validation, replay, concurrency and rollback/idempotency behavior match contract. | PASS |
| TC-005.1–005.8 | Payment | Business-rule, HTTP and Payment integration suites | CASH/QR rules, expiry, locking, one Payment, replay/conflict and rollback behavior match contract. | PASS |
| TC-006.1–006.7 | Cancel / expiry | Cancel HTTP/integration suites | Pending/expired cancellation, replay, no-body validation, paid conflict and rollback behavior match contract. | PASS |
| TC-007.1–007.7 | Validation / errors | HTTP unit + validation integration suites | Strict validation, fixed error codes, Thai messages and sanitized unexpected errors are correct. | PASS |
| TC-008.1–008.5 | Integrity / concurrency | API integration + schema + DB lock support | Atomic rollback, unique/FK guards, same-key serialization and competing Payment integrity hold. | PASS |
| TECH01–TECH04 | Technical decisions | Schema/Payment/Cancel/validation suites | Approved enum, HTTP status, not-found and error catalog decisions are verified. | PASS |
| RC01–RC04 / RU01–RU08 | Resolved requirements | Three API suites + schema + seed | Approved idempotency, expiration, seed, deletion and image-path decisions are verified. | PASS |

## 6. Representative API Test Scripts

### TS-API-001 — Create Sale success
**Related:** FR-001, FR-002, FR-003, FR-010  
**Action:** `POST /api/v1/sales` with a new valid `Idempotency-Key` and valid `product_code`, e.g. `P001`.  
**Expected:** HTTP `201`; Sale identity, Product snapshot, `quantity: 1`, integer total, `PENDING`, creation time and five-minute expiry; one Sale and successful idempotency state commit atomically.  
**Mapped evidence:** TC-004.1.  
**Result:** PASS.

### TS-API-002 — Create Sale replay
**Related:** FR-011, FR-014  
**Action:** Repeat TS-API-001 with the same key and same logical request.  
**Expected:** HTTP `200`; same Sale identity; no duplicate Sale; current persisted Sale status returned.  
**Mapped evidence:** TC-004.3–TC-004.5.  
**Result:** PASS.

### TS-API-003 — CASH Payment
**Related:** FR-004, FR-006  
**Action:** For a non-expired `PENDING` Sale, call `POST /api/v1/sales/:sale_id/payment` with a new key, `payment_method: CASH`, and integer `amount_received >= total`.  
**Expected:** HTTP `201`; one Payment, correct integer change, Sale becomes `PAID`, atomic business/idempotency persistence.  
**Mapped evidence:** TC-005.1–TC-005.2.  
**Result:** PASS.

### TS-API-004 — QR Payment
**Related:** FR-005, FR-006  
**Action:** Submit `QR_PAYMENT` for a non-expired `PENDING` Sale with `amount_received` exactly equal to total.  
**Expected:** HTTP `201`; one Payment; no `change` field; Sale becomes `PAID`.  
**Mapped evidence:** TC-005.1–TC-005.2.  
**Result:** PASS.

### TS-API-005 — Expired Sale Payment
**Related:** FR-008, BR-005, BR-006  
**Action:** Execute Payment against a `PENDING` Sale at/after its expiry boundary.  
**Expected:** HTTP `200` with `CANCELLED`; cancellation persisted; no Payment.  
**Mapped evidence:** TC-005.5.  
**Result:** PASS.

### TS-API-006 — Cancel Sale
**Related:** FR-007, FR-009  
**Action:** Call `POST /api/v1/sales/:sale_id/cancel` with a new key and no request body for a `PENDING` Sale.  
**Expected:** HTTP `200`; Sale becomes `CANCELLED`; successful idempotency state commits atomically.  
**Mapped evidence:** TC-006.1–TC-006.4.  
**Result:** PASS.

### TS-API-007 — Strict validation
**Related:** BR-003, BR-007  
**Action:** Exercise missing/unknown/wrong-type fields, malformed JSON, invalid payment method, numeric strings, invalid keys, and JSON body on Cancel.  
**Expected:** Approved `400`/`404` errors using the common envelope; no invalid partial business state.  
**Mapped evidence:** TC-004.2, TC-005.3–005.4, TC-006.5–006.6, TC-007.  
**Result:** PASS.

### TS-API-008 — Idempotency conflict/failure
**Related:** FR-010–FR-013  
**Action:** Reuse a successful key with a different logical request; separately retry a key whose business operation ended in terminal `FAILED`.  
**Expected:** `409 IDEMPOTENCY_CONFLICT` for changed request; `409 IDEMPOTENCY_FAILED` for failed-key retry; no duplicate resource.  
**Mapped evidence:** Create/Payment/Cancel integration suites.  
**Result:** PASS.

### TS-API-009 — Concurrency
**Related:** FR-014  
**Action:** Issue overlapping same-key operations and competing Payment requests against the same Sale using the integration concurrency harness.  
**Expected:** same-key operation executes once; competing Payments produce at most one successful Payment; database uniqueness remains the final integrity guard.  
**Mapped evidence:** TC-004.4, TC-005.6, TC-008.4, TC-008.5.  
**Result:** PASS.

## 7. Traceability Summary

```text
SRS requirement
    -> design/API contract
    -> TEST_MATRIX test case
    -> executable test
    -> recorded execution evidence
    -> PASS / FAIL / BLOCKED
```

`docs/TEST_MATRIX.md` remains the detailed test-to-source-file map. The PASS results above are backed by the recorded local final-gate execution, including the complete Docker-backed test run.