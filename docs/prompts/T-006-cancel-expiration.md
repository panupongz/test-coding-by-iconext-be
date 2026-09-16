You are implementing **T-006 — Cancel + Expiration** for the `test-coding-by-iconext-be` repository.

Before changing any code, read and follow the repository source of truth, especially:

* `AGENTS.md` and any applicable nested `AGENTS.md`
* `IMPLEMENTATION_CHECKLIST.md`
* existing implementation from T-001 through T-005
* existing tests
* existing API/database conventions
* existing prompt-audit files under `docs/prompts/`

## Prompt audit requirement

Preserve this implementation prompt **verbatim** in:

`docs/prompts/T-006-cancel-expiration.md`

Do not rewrite, summarize, or normalize the prompt text.

---

## Objective

Implement only **T-006: Cancel + Expiration**.

Do not implement future tasks such as T-007+.

T-001 through T-005 are already completed and should be treated as the existing baseline. Do not redesign their behavior unless a minimal change is strictly required for T-006.

---

## Required behavior

### 1. Cancel a PENDING sale

Implement the existing API contract for cancelling a sale.

A sale may be cancelled when its current status is `PENDING`.

The cancellation must:

* transition the sale from `PENDING` to `CANCELLED`
* persist the change correctly
* follow the existing transaction/concurrency strategy
* respect the existing Idempotency-Key contract
* not create a Payment
* not modify the product price snapshot or other immutable sale data

Repeated requests using the same valid Idempotency-Key must follow the project's existing idempotency semantics.

Do not allow a successfully paid sale to be changed back to `CANCELLED`.

---

### 2. Sale expiration

Use the existing `expires_at` created by T-004.

When a `PENDING` sale has expired:

`expires_at <= current time`

the system must transition that sale to:

`CANCELLED`

The transition must be performed safely and transactionally.

Do not introduce a background scheduler/cron unless the repository source of truth explicitly requires one.

Expiration should be handled through the existing request/business flow defined by the project.

---

### 3. Payment attempt on an expired sale

This is an explicitly resolved project rule.

When payment is attempted for a sale that:

* is currently `PENDING`
* but `expires_at` has already passed

the system must transactionally transition the sale to:

`CANCELLED`

and return the response according to the existing API contract representing the resulting cancelled sale.

Expected HTTP behavior for the resolved U01/U02 rule:

`200` with the sale in `CANCELLED` state.

No Payment record may be created.

The expiration check and state transition must be concurrency-safe.

---

### 4. Existing terminal states

Preserve the behavior established by T-004/T-005.

In particular:

* `PAID` must never become `CANCELLED`
* `CANCELLED` must never become `PAID`
* expiration must not overwrite an already terminal state
* retries must not create duplicate side effects
* payment records must not be created for an expired/cancelled sale

Use the repository's existing error/response conventions rather than inventing a new format.

---

## Transaction and concurrency requirements

Operations that inspect and change sale state must follow the locking/transaction strategy already established in the repository.

Avoid race conditions such as:

* payment and cancellation succeeding simultaneously
* two cancellation requests producing inconsistent state
* an expired sale being paid while another request is cancelling it
* duplicate side effects caused by idempotent retries

Do not weaken the concurrency guarantees implemented in T-005.

---

## Tests

Add or update focused automated tests for T-006.

At minimum cover:

1. cancelling a valid `PENDING` sale
2. retrying cancellation according to Idempotency-Key semantics
3. cancelling an already `CANCELLED` sale
4. attempting to cancel a `PAID` sale
5. expired `PENDING` sale transitions to `CANCELLED`
6. payment attempted after expiration returns the resolved `CANCELLED` result
7. expired payment attempt creates no Payment record
8. terminal state cannot incorrectly transition
9. relevant concurrency/race behavior
10. rollback/error behavior where applicable

Reuse existing test helpers and patterns.

Do not rewrite unrelated tests.

---

## Scope discipline

Keep the implementation minimal and focused on T-006.

Do NOT:

* implement T-007 or later tasks
* redesign existing APIs
* change unrelated database schema
* modify seed behavior
* change T-004 sale creation semantics
* change T-005 payment semantics except where required to enforce expiration
* add frontend code
* add unnecessary dependencies
* perform unrelated refactoring

If repository documentation conflicts with assumptions in this prompt, treat the repository source of truth and explicitly resolved T-006 rules as authoritative and report the conflict before making a speculative change.

---

## Verification

After implementation:

1. run the relevant T-006 tests
2. run the existing regression test suite
3. run applicable lint/typecheck/build checks
4. inspect the final diff for scope creep
5. verify `docs/prompts/T-006-cancel-expiration.md` contains this prompt verbatim
6. verify no T-007+ work was introduced

Report:

* files changed
* behavior implemented
* tests added/updated
* commands executed
* test/check results
* any assumptions or repository conflicts
* any remaining risks

Do **not** commit or push.

Do **not** mark T-006 as DONE yet.

Stop after implementation and verification so the result can be reviewed before T-006 is closed.

---

# Prompt audit record

## Task ID and title

T-006 — Cancel + Expiration

## Objective

Implement Cancel and request-driven persisted expiration transitions atomically, with the existing idempotency and concurrency guarantees.

## Requirement references

Q017–Q019, Q030–Q039, Q113–Q121, Q145–Q146; RC03–RC04; RU01–RU04; TECH03; ES01–ES08; ES10–ES11; SRG01; AUD01

## Additional / follow-up prompts

### Prompt #2 — Independent SRG01 review and final gate

```text
Perform the **independent SRG01 review and final gate for T-006 — Cancel + Expiration**.

T-006 has already been implemented and is currently in `REVIEW`.

Do **not** implement new features unless you find a concrete defect required to satisfy T-006.

## Review scope

Independently inspect the actual repository diff and implementation. Do not rely only on the previous implementation summary.

Read the relevant repository source of truth, including:

- `IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/T-006-cancel-expiration.md`
- T-006 implementation and tests
- relevant T-004/T-005 code where sale/payment behavior interacts with T-006
- applicable repository instructions

Verify that T-006 correctly satisfies the intended contract.

## Required checks

Confirm at minimum:

1. `PENDING → CANCELLED` is transactional and concurrency-safe.
2. Cancelling an already `CANCELLED` sale follows the expected idempotent behavior.
3. A `PAID` sale cannot become `CANCELLED`.
4. An expired `PENDING` sale transitions safely to `CANCELLED`.
5. Payment attempted after expiration returns the resolved `200 CANCELLED` behavior.
6. No Payment record is created for an expired/cancelled sale.
7. Idempotency-Key replay behavior is correct.
8. Concurrent cancellation cannot create inconsistent state.
9. Payment-vs-cancel races preserve a valid terminal state.
10. rollback/error paths do not leave partial state.
11. T-005 concurrency guarantees have not been weakened.
12. no scheduler, unrelated schema/seed/dependency changes, or T-007+ scope creep were introduced.

Also inspect for:

- transaction-boundary mistakes
- row-locking mistakes
- race conditions
- incorrect HTTP/error mapping
- idempotency bugs
- duplicate side effects
- insufficient or misleading tests
- regressions in existing sale/payment behavior

## Verification

Run the appropriate:

- T-006 focused tests
- unit tests
- live MySQL integration tests where supported
- regression tests
- typecheck
- lint
- build
- `git diff --check`

Review the final diff as well.

## Decision

If you find a real T-006 defect:

- fix only the minimal defect
- add/update the necessary test
- rerun affected verification
- keep T-006 in `REVIEW`
- clearly report what prevented closure

If no blocking defect remains and all required verification passes:

- update `IMPLEMENTATION_CHECKLIST.md` to mark **T-006 DONE**
- preserve the repository's existing checklist/history conventions
- do not modify T-007+
- report that T-006 passed SRG01/final gate

Do not commit or push.

At the end report concisely:

- review findings
- any fixes made
- verification results
- scope check
- final T-006 status
- whether it is safe to commit
```

### Prompt #3 — Independent post-fix final gate

```text
Perform the **independent post-fix final gate for T-006 — Cancel + Expiration**.

The previous SRG01 review found and fixed exactly these three findings:

- `SRG01-T006-001` — expired Create Sale replay could remain `PENDING`; the fix now row-locks and persists `CANCELLED` transactionally.
- `SRG01-T006-002` — concurrency tests did not prove real overlap; deterministic barriers were added for same-key cancellation, payment/cancel lock ordering, and expired races.
- `SRG01-T006-003` — rollback after the successful idempotency write was untested; final-write rollback and `FAILED` retry behavior are now covered.

T-006 must remain in `REVIEW` until this independent post-fix review passes.

## Review

Independently inspect the actual current diff and relevant implementation.

Focus on verifying that the three fixes above are correct and have not introduced regressions.

Also verify the core T-006 invariants:

- `PENDING → CANCELLED` is transactional and concurrency-safe.
- `PAID` cannot become `CANCELLED`.
- `CANCELLED` cannot become `PAID`.
- expired sales resolve to `CANCELLED` correctly.
- payment after expiration returns the resolved `200 CANCELLED` behavior.
- no Payment is created for expired/cancelled sales.
- Idempotency-Key replay behavior remains correct.
- rollback cannot leave partial state.
- concurrency tests genuinely exercise overlapping operations rather than only sequential execution.
- T-004/T-005 behavior has not regressed.
- no T-007+ or unrelated scope has been introduced.

Do not perform unrelated refactoring or enhancements.

## Verification

Run the relevant verification, including:

- T-006 integration tests
- Create Sale integration tests affected by the fix
- T-005 Payment regression tests
- unit tests
- full supported MySQL integration suite
- typecheck
- lint
- build
- `git diff --check`

Inspect the final diff for scope creep.

## Final decision

If a **new substantive defect** is found:

- do not mark T-006 `DONE`
- report the defect clearly
- keep T-006 in `REVIEW`
- do not make speculative or unrelated changes

If no blocking defect is found and verification passes:

- mark **T-006 as&#x20;****`DONE`** in `IMPLEMENTATION_CHECKLIST.md`
- record the successful post-fix SRG01/final-gate result using the repository's existing audit/checklist convention
- do not modify T-007+
- do not commit or push

At the end report only:

- post-fix review result
- verification results
- whether any new defect was found
- final T-006 status
- whether the working tree is safe to stage/commit
```

## Codex implementation summary

Implemented the Cancel Sale HTTP boundary and service. Cancellation uses the existing per-idempotency-key advisory lock, a database transaction, and a Sale row lock. `PENDING` becomes `CANCELLED`; already `CANCELLED` returns the same successful result; `PAID` remains unchanged and returns the existing conflict contract. Successful and failed idempotency records follow RC03–RC04. T-005's payment expiration flow remains concurrency-safe. The SRG01 fix also makes successful Create Sale replay row-lock and transactionally persist RU01 expiration before returning current Sale state.

## Files created / modified

- `src/application/services/cancel-sale-service.ts`
- `src/application/services/create-sale-service.ts`
- `src/http/controllers/cancel-sale-controller.ts`
- `src/database/repositories/idempotency-repository.ts`
- `src/http/routes/api-routes.ts`
- `src/app.ts`
- `src/server.ts`
- `tests/unit/cancel-sale-http.test.ts`
- `tests/integration/cancel-sale.test.ts`
- `tests/integration/create-sale.test.ts`
- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/T-006-cancel-expiration.md`

## Tests executed

- `npm run test:unit -- --run tests/unit/cancel-sale-http.test.ts`
- `npm run test:integration -- --run tests/integration/cancel-sale.test.ts` (host guard run; database suites skipped)
- `npm test` (host regression run; database suites skipped)
- isolated Docker Compose MySQL 8.4 integration run: `npm run test:integration -- --run tests/integration/cancel-sale.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`
- isolated SRG01 Docker Compose full run: `npm test`
- isolated post-fix focused run: `npx vitest run tests/integration/cancel-sale.test.ts tests/integration/create-sale.test.ts tests/integration/payment.test.ts`
- isolated post-fix full final-gate run: `npm test`

## Test results

- Unit: PASS — 46/46.
- Disposable MySQL 8.4 full regression: PASS — 108/108 across 12 files, including 12 Cancel, 10 Create Sale, and 16 Payment tests.
- Host regression: PASS — 57 passed; 51 database tests skipped by the required disposable-context guard.
- Typecheck, lint, build, and diff whitespace check: PASS.
- Post-fix focused live MySQL verification: PASS — 38/38 across Cancel, Create Sale, and Payment.
- Independent post-fix full live MySQL verification: PASS — 108/108; no skipped tests.

## Senior Review findings

- `SRG01-T006-001` — MAJOR — FIXED: successful Create Sale replay returned an expired persisted `PENDING` Sale without applying RU01.
- `SRG01-T006-002` — MAJOR — FIXED: cancellation concurrency tests did not use synchronization barriers, so overlap was not proven.
- `SRG01-T006-003` — MAJOR — FIXED: cancellation rollback coverage did not inject failure after the successful idempotency write.
- Independent post-fix re-review verified `SRG01-T006-001`–`003` as fixed. New findings: BLOCKER 0, MAJOR 0, MINOR 0.
- Transaction boundaries, Sale row locks, idempotency serialization, both payment/cancel lock orders, expired races, final-write rollback, HTTP contracts, T-004/T-005 regressions, and scope were re-inspected. `SRG01: PASS`.

## Fixes made after review

- Successful Create Sale replay now transactionally locks the Sale, persists expired `PENDING → CANCELLED`, and returns the current cancelled Sale.
- Added deterministic barriers for same-key cancellation, both payment/cancel lock orders, and expired payment/cancel overlap.
- Added rollback injection after successful cancellation idempotency persistence and verified full rollback, separately persisted `FAILED`, and retry `409`.

## Final Task status

DONE — independent post-fix SRG01 and Final Gate passed; all three prior findings are verified fixed, Prompt #3 is preserved verbatim, and checklist closure is complete.
