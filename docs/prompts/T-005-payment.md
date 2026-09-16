# T-005 — Payment + Concurrency + Idempotency

## Task ID and title

T-005 — Payment + Concurrency + Idempotency

## Objective

Implement Payment ที่ถูกต้องภายใต้ state, amount, expiry, transaction, idempotency และ concurrent requests

## Requirement references

Q004–Q008, Q020–Q022, Q034–Q035, Q083–Q108, Q120–Q121, Q145–Q146; RC02; RC04; RU01–RU02; TECH02; ES01–ES08; ES10–ES11; SRG01; AUD01

## Exact user prompt sent to Codex

### Prompt #1 — T-005 implementation

```text
You are implementing task T-005 in the current repository.

## Goal

Implement T-005 completely according to the repository's existing Source of Truth.

Do NOT guess or invent requirements.

## Source of Truth

Before changing any code, read and follow:

1. `AGENTS.md`
2. `docs/phase-2/IMPLEMENTATION_CHECKLIST.md` or the repository's current implementation checklist path
3. Existing architecture, conventions, and implementation from T-001 through T-004
4. Existing relevant specs / decision documents
5. Existing prompt audit files under `docs/prompts/`

The checklist and repository documentation take precedence over assumptions in this prompt.

---

## Step 1 — Inspect T-005

Locate T-005 in the implementation checklist.

Identify:

- exact scope
- acceptance criteria
- dependencies
- database/schema requirements
- API/service requirements
- validation requirements
- transaction/concurrency requirements, if applicable
- idempotency requirements, if applicable
- required tests
- explicit out-of-scope items

Also inspect the implementation produced by T-001 through T-004 and reuse existing patterns rather than introducing unnecessary architecture.

If T-005 is blocked, contradictory, or materially underspecified, STOP before implementation and report the blocker.

Do not invent a solution to an unresolved product requirement.

---

## Step 2 — Prompt Audit

Before or together with implementation, preserve this exact prompt verbatim in the repository following the existing prompt-log convention.

Use the appropriate T-005 prompt file under:

`docs/prompts/`

Follow the naming/format convention already established by T-001 through T-004.

Do not rewrite, summarize, or normalize this prompt in the audit record.

---

## Step 3 — Implement T-005

If T-005 is sufficiently specified and unblocked:

Implement only the scope required by T-005.

Requirements:

- follow existing repository architecture
- follow existing TypeScript/Express/MySQL conventions
- reuse existing database/service/repository patterns
- preserve existing behavior from T-001 through T-004
- implement all T-005 acceptance criteria
- keep changes minimal and task-scoped
- do not perform unrelated refactoring
- do not implement future tasks
- do not weaken existing validation, constraints, or tests merely to make tests pass

Where database state changes are involved, preserve correctness and atomicity according to the documented requirements.

Where concurrency or idempotency is part of T-005, test the behavior explicitly rather than relying only on sequential happy-path tests.

---

## Step 4 — Tests

Add/update automated tests necessary to prove T-005 acceptance criteria.

Cover at minimum all behaviors explicitly required by the T-005 checklist, including:

- happy path
- required validation failures
- relevant not-found/conflict cases
- persistence/state transitions
- duplicate/retry behavior when idempotency applies
- concurrent request behavior when concurrency applies
- rollback/atomicity behavior when transactions apply

Do not add artificial tests that merely mirror implementation details.

Tests should verify externally observable behavior and important database invariants.

---

## Step 5 — Verification

Run the repository's applicable verification commands.

At minimum inspect the available scripts and run the relevant equivalents of:

- typecheck
- lint
- build
- automated tests

If the repository uses disposable/containerized MySQL for integration tests, use the established T-001–T-004 workflow.

Do not claim PASS for anything you did not actually run.

For every command report:

- command
- PASS / FAIL
- relevant result

If something cannot be run, state exactly why.

---

## Step 6 — Acceptance Mapping

After implementation, map every T-005 acceptance criterion to:

- implementation location
- test proving it
- PASS / FAIL

Explicitly identify any criterion that is not proven.

---

## Step 7 — Scope Review

Inspect the final diff and verify:

- no unrelated changes
- no accidental secrets
- no generated junk
- no implementation belonging to later tasks
- prompt audit is present
- existing T-001–T-004 behavior remains intact

Run:

`git status --short`

and relevant diff checks.

Do NOT commit or push.

Do NOT mark T-005 DONE yet.

---

## Final Response

Return a concise report containing:

1. T-005 scope discovered from the Source of Truth
2. files changed
3. implementation summary
4. tests added/updated
5. verification commands and exact PASS/FAIL results
6. acceptance-criteria mapping
7. remaining risks/blockers, if any
8. `git status --short`
9. whether T-005 is ready for Senior Review

Stop after reporting.

Do not perform Senior Review or Final Gate in this prompt.\
Do not commit or push.
```

## Additional / follow-up prompts

### Prompt #2 — T-005 Senior Review and Final Gate

```text
Perform the Senior Review and Final Gate for T-005.

T-005 implementation is complete but is currently in REVIEW status.

Do NOT assume the implementation is correct merely because the existing tests pass.

## Source of Truth

Read and follow:

1. `docs/IMPLEMENTATION_CHECKLIST.md`
2. `docs/prompts/T-005-payment.md`
3. Relevant repository documentation
4. Existing architecture and conventions established by T-001 through T-004
5. The complete T-005 diff

Note: `AGENTS.md` does not currently exist in this repository. Do not treat its absence as a blocker.

---

## 1. Senior Review

Review the complete T-005 implementation against every acceptance criterion.

Pay particular attention to:

* Payment state transitions
* CASH / QR behavior
* amount validation
* payment persistence
* Sale row locking
* atomic Payment + PAID transition
* expired PENDING -> CANCELLED behavior
* Idempotency-Key handling
* same-key successful replay
* same-key different-request conflict
* failed-key retry behavior
* concurrent payment attempts
* rollback behavior
* database invariants
* error mapping / HTTP status behavior

Do not limit the review to the newly created files. Inspect all modified files and relevant existing code.

---

## 2. Concurrency / Transaction Deep Review

Explicitly review the interaction between:

* MySQL advisory locks
* `SELECT ... FOR UPDATE`
* transaction boundaries
* `payments.sale_id UNIQUE`
* idempotency persistence

Verify:

1. lock acquisition ordering cannot introduce an avoidable deadlock
2. advisory locks are always released correctly
3. exceptions cannot leak locks
4. transaction rollback leaves Sale and Payment in a valid state
5. two simultaneous payments cannot create two successful Payments
6. simultaneous requests using the same Idempotency-Key behave deterministically
7. simultaneous requests using different keys for the same Sale cannot both succeed
8. retry after a failed transaction behaves according to the T-005 contract
9. no transaction commits partially
10. lock timeout / database error paths do not corrupt state

Inspect connection ownership carefully: advisory locks and transactions must operate on the intended MySQL connection.

---

## 3. Idempotency Deep Review

Verify that idempotency is based on the documented request identity and not merely the key itself.

Review behavior for:

* same key + same request after success
* same key + different request
* same key after failed attempt
* concurrent same-key requests
* concurrent different-key requests
* replay after transaction rollback

Ensure FAILED idempotency persistence does not accidentally participate in or get rolled back with the transaction in a way that violates the documented contract.

---

## 4. Tests

Review whether the current unit and integration tests genuinely prove the acceptance criteria rather than merely following the implementation.

Add or improve tests for any uncovered edge case discovered during review.

Especially verify concurrency tests actually overlap requests and are capable of detecting a race condition.

Do not weaken tests to make the implementation pass.

---

## 5. Fix Findings

If Senior Review finds any issue:

* fix it
* add/update the appropriate regression test
* keep the fix scoped to T-005
* re-run all affected verification

Do not defer a correctness issue merely because the existing tests currently pass.

---

## 6. Full Verification

Run the applicable repository verification suite, including:

* `npm run typecheck`
* `npm run test:unit`
* `npm run lint`
* `npm run build`
* `npm test`

Run the established disposable MySQL integration-test workflow so the DB-gated integration tests actually execute.

Also run:

`git diff --check`

and inspect:

`git status --short`

Report exact PASS / FAIL results.

Do not claim a check was performed unless it was actually executed.

---

## 7. Final Acceptance Mapping

For every T-005 acceptance criterion, provide:

* implementation location
* proving test
* PASS / FAIL

There must be no unproven acceptance criterion before Final Gate passes.

---

## 8. Final Gate

T-005 may pass Final Gate only if:

* all acceptance criteria are implemented
* Senior Review has no unresolved correctness findings
* concurrency behavior is proven
* idempotency behavior is proven
* transaction/rollback behavior is proven
* required unit tests pass
* required MySQL integration tests pass
* typecheck passes
* lint passes
* build passes
* diff check passes
* no unrelated implementation is present
* no secrets or generated junk are present

If any requirement fails, keep T-005 in REVIEW and clearly report what remains.

If every gate passes:

1. update `docs/IMPLEMENTATION_CHECKLIST.md` to mark T-005 DONE using the existing checklist convention
2. update the T-005 prompt audit file so this exact second prompt is preserved verbatim according to the existing convention
3. perform one final `git diff --check`
4. perform one final `git status --short`

Do NOT commit.
Do NOT push.

---

## Final Response

Return:

1. Senior Review findings
2. fixes made, if any
3. tests added/changed, if any
4. concurrency/idempotency review result
5. verification commands with exact PASS/FAIL
6. final acceptance mapping
7. remaining risks, if any
8. final `git status --short`
9. Final Gate: PASS or FAIL
10. T-005 status: DONE or REVIEW

Stop after reporting.
```

## Codex implementation summary

Implemented the Payment workflow for `POST /api/v1/sales/:sale_id/payment` using the established route → controller → service → repository → MySQL pattern. The controller performs strict path/header/body validation. The service serializes idempotency keys with MySQL advisory locks, locks the Sale row, validates state/expiry/amount, atomically inserts Payment plus transitions `PENDING` to `PAID`, persists expired `PENDING` Sales as `CANCELLED` without creating Payment, and records failed operations as `FAILED` in a separate transaction after rollback. Successful Payment retries return the existing Payment with `200`; same-key different requests and failed-key retries return `409`.

## Files created / modified

- `src/application/errors/application-error.ts`
- `src/application/services/payment-service.ts`
- `src/app.ts`
- `src/database/repositories/idempotency-repository.ts`
- `src/database/repositories/sale-repository.ts`
- `src/domain/payment.ts`
- `src/http/controllers/payment-controller.ts`
- `src/http/routes/api-routes.ts`
- `src/server.ts`
- `tests/integration/payment.test.ts`
- `tests/unit/payment-http.test.ts`
- `README.md`
- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/T-005-payment.md`

## Tests executed

- `npm run typecheck`
- `npm run test:unit`
- `npm run lint`
- `npm run build`
- `npm test`
- `docker compose -p t005-test --env-file .env.example up -d mysql`
- `docker compose -p t005-test --env-file .env.example run --build --rm -e NODE_ENV=test -e DB_TEST_CONTEXT=disposable backend npm test`
- `docker compose -p t005-test --env-file .env.example down -v`

## Test results

- `npm run typecheck`: PASS
- `npm run test:unit`: PASS — 5 files, 36 tests
- `npm run lint`: PASS
- `npm run build`: PASS
- `npm test`: PASS — 6 files passed, 4 skipped; 47 passed, 38 skipped because live DB tests require disposable context
- disposable Compose MySQL suite: PASS — 10 files, 85 tests, including `tests/integration/payment.test.ts` 16 tests
- `git diff --check`: PASS
- Prompt #2 normalized verbatim content check: PASS

## Senior Review findings

- SRG01-T005-001 — MAJOR — FIXED: TC-005.8 did not inject failure after the successful idempotency write, so full rollback at the final write boundary was unproven.
- SRG01-T005-002 — MAJOR — FIXED: the simultaneous-Payment test launched requests together but had no synchronization proving they overlapped; same-key concurrent serialization was also untested.
- SRG01-T005-003 — MAJOR — FIXED: TC-005.5 covered a Sale expired before the request but not expiry during the Payment transaction or the required second expiry check.
- SRG01-T005-004 — MINOR — FIXED: CASH/QR happy-path tests did not fully assert persisted Payment fields/counts and QR Sale state.
- SRG01-T005-005 — MINOR — FIXED: Idempotency-Key HTTP validation was duplicated between Create Sale and Payment controllers.
- Connection ownership and lock order were verified: advisory lock acquisition/release and the transaction use the same pinned MySQL connection; each operation acquires idempotency lock before Sale row lock; `finally` releases the lock and connection; `payments.sale_id UNIQUE` remains the final duplicate guard.
- No unresolved BLOCKER, MAJOR, or MINOR findings remain. `SRG01: PASS`.

## Fixes made after review

- Added request-time plus post-Sale-lock expiry checks and a regression test where expiry crosses during the transaction.
- Added deterministic concurrency barriers proving overlap for different keys on one Sale and serialization for concurrent same-key requests.
- Added rollback injection after the successful idempotency update; verified Payment/Sale rollback, separately committed `FAILED`, and retry `409` at all covered write boundaries.
- Strengthened CASH/QR persistence assertions, expired replay, missing/invalid Sale error codes, and cross-operation key conflict coverage.
- Extracted shared Idempotency-Key boundary validation for Create Sale and Payment without changing the existing contract.
- The first enhanced disposable run failed two new concurrency tests because Supertest requests are lazy; dispatch was corrected with attached promise consumers, then the isolated and full suites passed.

## Final Task status

DONE — SRG01 and Final Gate passed; Prompt #2 is preserved verbatim and checklist closure is complete.
