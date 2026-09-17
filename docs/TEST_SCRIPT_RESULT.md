# Backend Test Script + Result

## 1. Purpose
This document defines the backend verification script and records execution results when evidence exists for the exact revision being documented. Detailed test-to-source mapping is maintained in `docs/TEST_MATRIX.md`.

## 2. Result convention

- `PASS`: a recorded execution for the documented revision verifies the expected behavior.
- `FAIL`: a recorded execution differs from the expected behavior.
- `BLOCKED`: execution was attempted but cannot complete because of an identified blocker.
- `NOT_RUN`: executable tests exist, but no execution output for the documented revision is recorded in this document.

A test file or a mapping in `TEST_MATRIX.md` is executable evidence design, not by itself proof of a PASS. Senior review therefore does not infer PASS solely from the existence of test code or from task/checklist completion. Update `Recorded Result`, execution date, revision and evidence only after an actual run.

## 3. Preconditions

1. Checkout the intended backend revision/branch.
2. Provide environment values based on `.env.example` without committing secrets.
3. Docker and Docker Compose are available for Docker-backed verification.
4. Dependencies are installed or the backend container is buildable.
5. MySQL starts healthy before database-dependent integration verification.

## 4. Recommended Execution Gate

Run the quality gates appropriate to the revision:

```bash
npm run typecheck
npm run lint
npm run build
npm test
npm run test:docker
```

For focused diagnosis, the repository also provides:

```bash
npm run test:unit
npm run test:integration
```

Record the tested Git commit SHA and execution date with the results below.

**Tested revision:** `NOT_RECORDED`  
**Execution date:** `NOT_RECORDED`

## 5. Test Script and Result Summary

| Test ID | Requirement / Area | Script / Evidence | Expected Result | Recorded Result |
| --- | --- | --- | --- | --- |
| TC-001.1–001.7 | Foundation / runtime | HTTP foundation + environment tests + `npm run test:docker` | Only approved routes exist; sanitized errors; Compose/readiness/configuration behavior is correct. | NOT_RUN |
| TC-002.1–002.9 | Database schema | `tests/integration/database-schema.test.ts` + Docker verification | Exact schema, constraints, FK/unique/check rules, migrations and persistent volume behavior are enforced. | NOT_RUN |
| TC-003.1–003.5 | Product seed | `tests/integration/product-seed.test.ts` + Docker seed execution | Exactly P001–P005 exist; valid fields/images; rerun safe; conflict rollback. | NOT_RUN |
| TC-004.1–004.6 | Create Sale | Create Sale unit/integration suites | Valid request creates one Sale; validation, replay, concurrency and rollback/idempotency behavior match contract. | NOT_RUN |
| TC-005.1–005.8 | Payment | Business-rule, HTTP and Payment integration suites | CASH/QR rules, expiry, locking, one Payment, replay/conflict and rollback behavior match contract. | NOT_RUN |
| TC-006.1–006.7 | Cancel / expiry | Cancel HTTP/integration suites | Pending/expired cancellation, replay, no-body validation, paid conflict and rollback behavior match contract. | NOT_RUN |
| TC-007.1–007.7 | Validation / errors | HTTP unit + validation integration suites | Strict validation, fixed error codes, Thai messages and sanitized unexpected errors are correct. | NOT_RUN |
| TC-008.1–008.5 | Integrity / concurrency | API integration + schema + DB lock support | Atomic rollback, unique/FK guards, same-key serialization and competing Payment integrity hold. | NOT_RUN |
| TECH01–TECH04 | Technical decisions | Schema/Payment/Cancel/validation suites | Approved enum, HTTP status, not-found and error catalog decisions are verified. | NOT_RUN |
| RC01–RC04 / RU01–RU08 | Resolved requirements | Three API suites + schema + seed | Approved idempotency, expiration, seed, deletion and image-path decisions are verified. | NOT_RUN |

## 6. Representative API Test Scripts

### TS-API-001 — Create Sale success
**Related:** FR-001, FR-002, FR-003, FR-010  
**Action:** `POST /api/v1/sales` with a new valid `Idempotency-Key` and valid `product_code`, e.g. `P001`.  
**Expected:** HTTP `201`; Sale identity, Product snapshot, `quantity: 1`, integer total, `PENDING`, creation time and five-minute expiry; one Sale and successful idempotency state commit atomically.  
**Mapped evidence:** TC-004.1.  
**Result:** NOT_RUN.

### TS-API-002 — Create Sale replay
**Related:** FR-011, FR-014  
**Action:** Repeat TS-API-001 with the same key and same logical request.  
**Expected:** HTTP `200`; same Sale identity; no duplicate Sale; current persisted Sale status returned.  
**Mapped evidence:** TC-004.3–TC-004.5.  
**Result:** NOT_RUN.

### TS-API-003 — CASH Payment
**Related:** FR-004, FR-006  
**Action:** For a non-expired `PENDING` Sale, call `POST /api/v1/sales/:sale_id/payment` with a new key, `payment_method: CASH`, and integer `amount_received >= total`.  
**Expected:** HTTP `201`; one Payment, correct integer change, Sale becomes `PAID`, atomic business/idempotency persistence.  
**Mapped evidence:** TC-005.1–TC-005.2.  
**Result:** NOT_RUN.

### TS-API-004 — QR Payment
**Related:** FR-005, FR-006  
**Action:** Submit `QR_PAYMENT` for a non-expired `PENDING` Sale with `amount_received` exactly equal to total.  
**Expected:** HTTP `201`; one Payment; no `change` field; Sale becomes `PAID`.  
**Mapped evidence:** TC-005.1–TC-005.2.  
**Result:** NOT_RUN.

### TS-API-005 — Expired Sale Payment
**Related:** FR-008, BR-005, BR-006  
**Action:** Execute Payment against a `PENDING` Sale at/after its expiry boundary.  
**Expected:** HTTP `200` with `CANCELLED`; cancellation persisted; no Payment.  
**Mapped evidence:** TC-005.5.  
**Result:** NOT_RUN.

### TS-API-006 — Cancel Sale
**Related:** FR-007, FR-009  
**Action:** Call `POST /api/v1/sales/:sale_id/cancel` with a new key and no request body for a `PENDING` Sale.  
**Expected:** HTTP `200`; Sale becomes `CANCELLED`; successful idempotency state commits atomically.  
**Mapped evidence:** TC-006.1–TC-006.4.  
**Result:** NOT_RUN.

### TS-API-007 — Strict validation
**Related:** BR-003, BR-007  
**Action:** Exercise missing/unknown/wrong-type fields, malformed JSON, invalid payment method, numeric strings, invalid keys, and JSON body on Cancel.  
**Expected:** Approved `400`/`404` errors using the common envelope; no invalid partial business state.  
**Mapped evidence:** TC-004.2, TC-005.3–005.4, TC-006.5–006.6, TC-007.  
**Result:** NOT_RUN.

### TS-API-008 — Idempotency conflict/failure
**Related:** FR-010–FR-013  
**Action:** Reuse a successful key with a different logical request; separately retry a key whose business operation ended in terminal `FAILED`.  
**Expected:** `409 IDEMPOTENCY_CONFLICT` for changed request; `409 IDEMPOTENCY_FAILED` for failed-key retry; no duplicate resource.  
**Mapped evidence:** Create/Payment/Cancel integration suites.  
**Result:** NOT_RUN.

### TS-API-009 — Concurrency
**Related:** FR-014  
**Action:** Issue overlapping same-key operations and competing Payment requests against the same Sale using the integration concurrency harness.  
**Expected:** same-key operation executes once; competing Payments produce at most one successful Payment; database uniqueness remains the final integrity guard.  
**Mapped evidence:** TC-004.4, TC-005.6, TC-008.4, TC-008.5.  
**Result:** NOT_RUN.

## 7. Traceability Summary

```text
SRS requirement
    -> design/API contract
    -> TEST_MATRIX test case
    -> executable test
    -> recorded execution evidence
    -> PASS / FAIL / BLOCKED
```

`docs/TEST_MATRIX.md` remains the detailed test-to-source-file map. This document must be updated after an actual execution on the target revision; PASS must not be inferred from test-code existence alone.
