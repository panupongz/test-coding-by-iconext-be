# Backend Test Script + Result

## 1. Purpose
This document records the backend verification script and result summary. Detailed executable mapping is maintained in `docs/TEST_MATRIX.md`.

## 2. Result convention

- `PASS`: executable evidence verifies the expected behavior.
- `FAIL`: observed behavior differs from the expected behavior.
- `BLOCKED`: the test cannot currently be executed.
- `NOT_RUN`: no execution evidence has been recorded.

The implementation checklist currently records T-001–T-010 as DONE with the final gate passed. The matrix maps the required cases to executable unit, integration, environment, and Docker evidence. This document therefore records the verified coverage represented by that completed gate; future code changes require rerunning the relevant commands and updating this result document.

## 3. Preconditions

1. Checkout the intended backend revision/branch.
2. Provide environment values based on `.env.example` without committing secrets.
3. Docker and Docker Compose are available for Docker-backed verification.
4. Dependencies are installed or the backend container is buildable.
5. MySQL starts healthy before database-dependent integration verification.

## 4. Test Script and Result Summary

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

## 5. Representative API Test Scripts

### TS-API-001 — Create Sale success

**Related:** FR-001, FR-002, FR-003, FR-010

**Request:** `POST /api/v1/sales` with a new valid `Idempotency-Key` and body containing a valid `product_code` such as `P001`.

**Expected:** HTTP `201`; response contains Sale identity, Product snapshot, `quantity: 1`, integer total, `PENDING`, creation time and five-minute expiry. Exactly one Sale and successful idempotency record commit atomically.

**Result:** PASS through TC-004.1 executable evidence.

### TS-API-002 — Create Sale replay

**Related:** FR-011, FR-014

Repeat TS-API-001 with the same key and same logical request.

**Expected:** HTTP `200`; same Sale identity; no duplicate Sale; current persisted Sale status is returned.

**Result:** PASS through TC-004.3–TC-004.5 evidence.

### TS-API-003 — CASH Payment

**Related:** FR-004, FR-006

Create a non-expired `PENDING` Sale, then call `POST /api/v1/sales/:sale_id/payment` with a new key, `payment_method: CASH`, and integer `amount_received >= total`.

**Expected:** HTTP `201`; one Payment is created, integer change is correct, Sale becomes `PAID`, and business/idempotency writes commit atomically.

**Result:** PASS through TC-005.1–TC-005.2 evidence.

### TS-API-004 — QR Payment

**Related:** FR-005, FR-006

Create a non-expired `PENDING` Sale and submit `QR_PAYMENT` with `amount_received` exactly equal to the Sale total.

**Expected:** HTTP `201`; one Payment is created, response has no `change`, and Sale becomes `PAID`.

**Result:** PASS through TC-005.1–TC-005.2 evidence.

### TS-API-005 — Expired Sale Payment

**Related:** FR-008, BR-005, BR-006

Execute Payment against a `PENDING` Sale at/after its expiry boundary.

**Expected:** HTTP `200` with `CANCELLED`; cancellation is persisted; no Payment exists.

**Result:** PASS through TC-005.5 evidence.

### TS-API-006 — Cancel Sale

**Related:** FR-007, FR-009

Call `POST /api/v1/sales/:sale_id/cancel` with a new key and no request body for a `PENDING` Sale.

**Expected:** HTTP `200`; Sale becomes `CANCELLED`; successful idempotency state commits atomically.

**Result:** PASS through TC-006.1–TC-006.4 evidence.

### TS-API-007 — Strict validation

**Related:** BR-003, BR-007

Exercise missing/unknown/wrong-type fields, malformed JSON, invalid payment method, numeric strings, invalid keys, and JSON body on Cancel.

**Expected:** Approved `400`/`404` errors using the common error envelope; no invalid partial business state is persisted.

**Result:** PASS through TC-004.2, TC-005.3–005.4, TC-006.5–006.6 and TC-007 evidence.

### TS-API-008 — Idempotency conflict/failure

**Related:** FR-010–FR-013

Reuse a successful key with a different logical request, and separately retry a key whose business operation ended in terminal `FAILED` state.

**Expected:** changed request returns `409 IDEMPOTENCY_CONFLICT`; failed-key retry returns `409 IDEMPOTENCY_FAILED`; no duplicate business resource is created.

**Result:** PASS through Create/Payment/Cancel integration evidence.

### TS-API-009 — Concurrency

**Related:** FR-014

Issue overlapping same-key operations and competing Payment requests against the same Sale using the integration concurrency harness.

**Expected:** same-key operation executes once and waiters observe the terminal result; competing Payment requests produce at most one successful Payment; database uniqueness remains the final integrity guard.

**Result:** PASS through TC-004.4, TC-005.6, TC-008.4 and TC-008.5 evidence.

## 6. Traceability Summary

```text
SRS requirement
    -> API / business design
    -> TEST_MATRIX test case
    -> executable unit/integration/environment/Docker evidence
    -> result in this document
```

`docs/TEST_MATRIX.md` remains the detailed test-to-source-file map. This document should be updated whenever the implementation or test evidence changes; a previously recorded PASS must not be assumed valid for an unverified future revision.
