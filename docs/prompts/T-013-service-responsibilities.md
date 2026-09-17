# T-013 — Review Service Responsibilities / Targeted Cleanup

## Task ID and title

T-013 — Review Service Responsibilities / Targeted Cleanup

## Objective

Review the application-service responsibilities for Create Sale, Payment, and Cancel, and perform only a targeted extraction with concrete maintainability and testability value while preserving the frozen behavior.

## Requirement references

T-013; T-001–T-010 Frozen Behavioral Baseline; T-011 HTTP DTO structural baseline; T-012 HTTP validation structural baseline; ES01–ES11; SRG01; AUD01

## Exact user prompt sent to Codex

### Prompt #1 — 2026-09-18

You are implementing **T-013 — Review Service Responsibilities / Targeted Cleanup** in the backend repository on branch `feature/implement`.

This task is explicitly:

**Review first → Refactor only if justified.**

A documented **no-code-change outcome is valid and preferred** when the existing service responsibilities are already appropriate.

Do not refactor merely to make the architecture look cleaner.

Before making any production-code change, read and follow:

* `AGENTS.md` and any applicable nested instructions
* `docs/IMPLEMENTATION_CHECKLIST.md`
* `docs/API.md`
* `docs/prompts/README.md`
* completed T-011 and T-012 prompt audits
* relevant controllers, DTOs, validation schemas, services, repositories, domain modules, transaction/idempotency helpers, and tests

Treat:

* **T-001–T-010 as the Frozen Behavioral Baseline**
* **T-011 as the HTTP DTO structural baseline**
* **T-012 as the HTTP validation structural baseline**

## Objective

Review the responsibilities of the existing application services for:

* Create Sale
* Payment
* Cancel

Identify concrete maintainability/testability problems such as:

* duplicated business logic
* mixed responsibilities
* clearly reusable application logic
* service methods doing work that belongs to another existing layer
* responsibilities that make the code materially harder to understand or test

Perform a targeted refactor **only when there is concrete evidence that the extraction improves clarity, maintainability, or testability without changing behavior**.

## Phase 1 — Review before changing code

First inspect the current implementation and document the responsibility of each service.

For each service, identify:

1. business/state decisions it owns
2. transaction orchestration it owns
3. idempotency orchestration it owns
4. locking coordination it owns
5. repository/data-access calls it coordinates
6. expiry/state-transition logic it coordinates
7. error propagation responsibilities
8. any duplicated or mixed responsibility
9. whether an extraction would provide concrete value

Pay particular attention to duplication across Create Sale, Payment, and Cancel.

Distinguish between:

* legitimate workflow-specific orchestration
* genuinely duplicated reusable logic
* superficial similarity that should remain separate

Do not assume similar-looking code should automatically be abstracted.

## Refactor decision

For every proposed extraction, explain before implementing:

* the concrete problem
* affected files/services
* why the current responsibility is misplaced or duplicated
* what new boundary/helper/module would own it
* measurable clarity/testability benefit
* why the extraction will not change execution ordering
* why the abstraction is not premature

If no extraction meets this threshold:

**Do not modify production code.**

Document the review result and proceed with verification/audit/checklist updates.

A no-code-change result is fully acceptable for T-013.

## If a refactor is justified

Keep the refactor minimal and targeted.

Preserve exactly:

* ordering of business operations
* validation timing
* Sale state-transition behavior
* expiry checks
* transaction boundaries
* transaction duration
* commit/rollback ordering
* lock acquisition
* lock ordering
* advisory-lock behavior
* `SELECT ... FOR UPDATE` behavior
* idempotency lifecycle
* request fingerprint behavior
* successful replay behavior
* conflict behavior
* `FAILED` persistence behavior
* repository query ordering where behaviorally significant
* error propagation/mapping
* concurrency behavior

Do not create generic architectural layers merely to reduce line count.

Do not introduce:

* generic manager classes
* generic workflow engines
* unnecessary base services
* service interfaces without concrete value
* generic transaction frameworks
* generic repository abstractions
* event systems
* dependency-injection frameworks
* new dependencies unless absolutely required

Prefer a small amount of explicit workflow code over a premature abstraction.

## Frozen Behavioral Baseline — MUST NOT CHANGE

Do not change:

* endpoint paths/methods
* request headers
* request JSON contracts
* response JSON contracts
* status codes
* validation behavior
* error codes/messages/mapping
* OpenAPI/Swagger consumer-visible behavior
* business rules
* Sale lifecycle/state behavior
* database schema
* migrations
* seed data
* SQL behavior
* repository return/null semantics
* transaction boundaries
* commit/rollback behavior
* locking strategy/order
* idempotency algorithm/fingerprint
* replay/conflict behavior
* concurrency behavior
* Docker/runtime behavior

Do not weaken, delete, skip, or rewrite existing tests merely to make a refactor pass.

If the proposed cleanup requires changing approved behavior:

**STOP and report the required behavioral change for explicit approval. Do not implement it.**

## Scope control

Implement **T-013 only**.

Do not start T-014 repository dependency-boundary work.

In particular, do not introduce repository interfaces/ports as part of T-013 unless an existing approved abstraction already exists and no new T-014 architectural decision is being made.

Do not rewrite SQL.

Do not perform unrelated formatting, naming, folder restructuring, dependency upgrades, or opportunistic cleanup.

## Baseline verification

Before changing production code, run:

1. typecheck
2. lint
3. build
4. existing tests/regression tests

Record actual results.

If the baseline fails before T-013 changes:

**STOP and report the baseline failure before modifying production code.**

## Implementation verification

If production code is changed, run after the refactor in this order:

1. typecheck
2. lint
3. build
4. existing tests/regression tests

Then run relevant:

* unit tests
* integration tests
* Create Sale tests
* Payment tests
* Cancel tests
* idempotency tests
* rollback/failure tests
* locking/concurrency tests
* isolated Docker/MySQL full gate
* API/OpenAPI contract regression
* `git diff --check`

Explicitly confirm transaction, locking, idempotency, and concurrency behavior remains unchanged.

If the outcome is **no production-code change**, still run sufficient regression/static gates to demonstrate that the reviewed baseline remains valid.

## Review the final diff

Inspect the complete T-013 diff.

Confirm:

* every production-code change has a documented justification
* no behavior changed
* no unnecessary abstraction was introduced
* no tests were weakened
* T-014 was not started
* documentation/audit changes accurately describe what actually happened

## Prompt audit

Follow AUD01.

Create/update the T-013 prompt audit file under `docs/prompts/` using the repository's existing convention.

Store this Prompt #1 **verbatim**.

Record:

* review scope
* service responsibility inventory
* concrete findings
* refactor/no-refactor decision and justification
* files changed
* baseline gate results
* implementation details, if any
* post-change verification
* test results
* remaining risks/findings
* current T-013 status

Do not mark T-013 `DONE` yet.

After the review/refactor and required verification are complete:

* update `docs/IMPLEMENTATION_CHECKLIST.md` with factual evidence
* move T-013 only to the appropriate review state
* leave it ready for an independent Senior Review / Final Gate

## Expected final response

Report:

1. Responsibility assessment for Create Sale service
2. Responsibility assessment for Payment service
3. Responsibility assessment for Cancel service
4. Concrete duplication/mixed-responsibility findings
5. Refactor decision for each finding
6. Whether production code changed
7. Exact justification for every extraction, if any
8. Files changed
9. Baseline gate results
10. Post-review/refactor test results
11. Transaction/locking/idempotency/concurrency regression results
12. Docker/MySQL/full-gate result
13. `git diff --check` result
14. Prompt-audit/checklist updates
15. Remaining risks/findings
16. Final T-013 status

Do **not** claim `DONE` until an independent Senior Review / Final Gate has passed.


## Additional / follow-up prompts

### Prompt #2 — 2026-09-18

Perform an **independent Senior Review / Final Gate for T-013 — Review Service Responsibilities / Targeted Cleanup**.

Do not assume the implementation is correct merely because tests passed.

Before reviewing, read and follow:

* `AGENTS.md` and applicable nested instructions
* `docs/IMPLEMENTATION_CHECKLIST.md`
* `docs/API.md`
* `docs/prompts/README.md`
* `docs/prompts/T-013-*.md`
* completed T-011 and T-012 audits
* the complete T-013 diff
* all affected Create Sale, Payment, and Cancel services
* the new advisory-lock helper
* relevant repositories, transaction/idempotency code, and tests

Treat:

* **T-001–T-010 as the Frozen Behavioral Baseline**
* **T-011 and T-012 as completed structural baselines**

T-014 must remain untouched.

## Review objective

Independently determine whether extracting the duplicated MySQL advisory-lock lifecycle into the new helper was justified, correctly scoped, and behavior-preserving.

This is not a request for additional cleanup.

Do not refactor further unless required to fix a concrete T-013 finding.

## 1. Re-evaluate the refactor justification

Review the pre-T-013 behavior of Create Sale, Payment, and Cancel.

Verify that the extracted code represented genuine duplication rather than superficially similar workflow logic.

Determine whether the new helper:

* has one narrow responsibility
* materially reduces real duplication
* improves maintainability/testability
* remains understandable without hiding workflow behavior
* does not become a generic manager/workflow/transaction abstraction
* does not absorb responsibilities that should remain in individual services

Confirm that leaving workflow bodies, replay handling, FAILED persistence, state transitions, expiry handling, transactions, and Sale row locking explicit was the correct scope decision.

## 2. Advisory-lock behavioral equivalence

Compare the old service implementations against the new helper line-by-line where necessary.

Verify exact preservation of:

* connection acquisition
* pinned connection usage
* advisory-lock key/name generation
* lock acquisition timing
* lock ordering
* timeout/wait behavior
* handling of lock acquisition result
* callback/work execution timing
* release timing
* release ordering
* connection release timing
* behavior when work succeeds
* behavior when work throws
* behavior when lock acquisition fails
* behavior when lock release fails
* behavior when connection acquisition/use fails
* error propagation
* cleanup semantics

Pay special attention to `try` / `catch` / `finally` differences introduced by the extraction.

Ensure the helper cannot accidentally:

* release a connection before releasing the lock
* swallow the original workflow error
* replace the original error with a cleanup error in a behaviorally different way
* leak a connection
* leak an advisory lock
* execute the callback without holding the expected lock
* acquire/release locks in a different order

## 3. Service responsibility review

Independently review:

### Create Sale

Confirm it still owns the appropriate workflow-specific responsibilities including product availability, price snapshot, Sale creation/expiry, transaction orchestration, idempotency orchestration, replay-time expiry transition, and repository coordination.

### Payment

Confirm it still owns Sale/payment validation, expiry checks, Payment creation, `PENDING → PAID`, Sale row locking, transaction orchestration, idempotency, and replay resolution.

### Cancel

Confirm it still owns cancellation eligibility, already-cancelled behavior, expiry handling, `PENDING → CANCELLED`, Sale row locking, transaction orchestration, idempotency, and replay resolution.

Identify any concrete responsibility incorrectly moved into the helper.

Do not recommend extraction merely because code looks similar.

## 4. Frozen Behavioral Baseline

Verify that T-013 did NOT change:

* API paths or methods
* request/response contracts
* HTTP statuses
* validation semantics
* error codes/messages/mapping
* OpenAPI/Swagger behavior
* business/state rules
* expiry semantics
* database schema/migrations/seed
* SQL/query behavior
* repository return/null semantics
* transaction boundaries
* transaction duration in a behaviorally meaningful way
* commit/rollback ordering
* Sale row-lock behavior
* advisory-lock ordering
* idempotency fingerprint/lifecycle
* successful replay behavior
* conflict behavior
* FAILED-record persistence
* concurrency outcomes
* Docker/runtime behavior
* dependencies

Confirm T-014 repository-boundary work was not started.

## 5. Test integrity

Review every T-013 test change.

Confirm:

* existing tests were not removed
* existing assertions were not weakened
* tests were not skipped to accommodate the refactor
* new helper tests validate meaningful behavior rather than implementation trivia
* tests cover success and failure cleanup where appropriate
* regression tests still protect transaction, idempotency, locking, and concurrency behavior

Pay particular attention to whether the helper tests sufficiently verify lock and connection cleanup under thrown errors.

If the helper introduces a meaningful failure path that is not protected by tests, classify it appropriately and add a narrowly scoped regression test if required.

## 6. Independent verification

Run fresh gates in this exact order:

1. typecheck
2. lint
3. build
4. existing host regression tests

Then run relevant:

* helper unit tests
* complete unit suite
* Create Sale integration tests
* Payment integration tests
* Cancel integration tests
* idempotency/replay/conflict tests
* rollback/failure-injection tests
* advisory-lock tests
* Sale row-lock tests
* concurrency tests
* API/OpenAPI regression
* isolated Docker/MySQL full gate
* `git diff --check`

Record actual counts/results.

Do not rely solely on the results recorded by Prompt #1.

## 7. Findings

Classify findings as:

* BLOCKER
* MAJOR
* MINOR
* NOTE

For each finding provide:

* file/location
* concrete problem
* behavioral/architectural impact
* whether it violates T-013 or the Frozen Behavioral Baseline
* required fix

If any BLOCKER, MAJOR, or behavior-affecting finding exists:

1. Do not mark T-013 DONE.
2. Fix only findings within T-013 scope.
3. Re-run affected tests.
4. Re-run all required Final Gate checks.
5. Record the finding, fix, and verification in the audit.

If a required fix would change approved T-001–T-010 behavior:

**STOP and report the required behavioral change for explicit approval.**

Do not make that behavioral change automatically.

## 8. Final diff review

Inspect the complete final diff and confirm:

* production changes are limited to the justified advisory-lock extraction
* service workflow ordering remains explicit
* no unnecessary abstraction exists
* no unrelated cleanup was introduced
* no SQL/repository architecture refactor occurred
* no T-014 work was performed
* test changes only add/protect behavior
* documentation/checklist/audit accurately reflect reality

Run:

`git diff --check`

## 9. Prompt audit and checklist

Follow AUD01.

Append this Prompt #2 **verbatim** to the existing T-013 prompt audit file.

Preserve Prompt #1 verbatim.

Record:

* independent review scope
* findings
* fixes, if any
* behavioral-equivalence assessment
* service-responsibility assessment
* test-integrity assessment
* actual gate/test results
* Docker/MySQL results
* final decision

T-013 may become `DONE` only if:

* Acceptance Criteria pass
* SRG01 passes
* no unresolved BLOCKER/MAJOR/MINOR findings remain
* Frozen Behavioral Baseline is preserved
* transaction/locking/idempotency/concurrency behavior is preserved
* tests pass
* prompt audit is complete

If all conditions pass:

* update `docs/IMPLEMENTATION_CHECKLIST.md`
* mark T-013 `DONE`
* mark completed T-013 sub-tasks and Acceptance Criteria
* add factual Final Gate evidence

## Expected final response

Report:

1. Final Gate result
2. Findings by severity
3. Refactor-justification assessment
4. Advisory-lock behavioral-equivalence assessment
5. Create Sale responsibility assessment
6. Payment responsibility assessment
7. Cancel responsibility assessment
8. Test-integrity assessment
9. Any fixes made
10. Typecheck/lint/build results
11. Host regression result/count
12. Helper/unit test results
13. Integration/idempotency/rollback/locking/concurrency results
14. Docker/MySQL full-gate result/count
15. API/OpenAPI regression result
16. `git diff --check` result
17. T-014 scope confirmation
18. Prompt-audit/checklist updates
19. Final T-013 status: `DONE` or not, with reason


## Review scope

- Create Sale, Payment, and Cancel application services.
- Their controllers, HTTP DTO and validation boundaries, domain rules, repositories, database/transaction usage, idempotency fingerprint and record lifecycle, advisory locks, Sale row locks, expiry transitions, error propagation, tests, and Docker/MySQL full gate.
- T-014 repository dependency-boundary work was explicitly excluded.

## Service responsibility inventory

### Create Sale

- Business/state decisions: requires an available non-deleted Product; snapshots its integer price; creates quantity 1 in `PENDING`; calculates the five-minute expiry; on successful replay, persists an expired `PENDING → CANCELLED` transition before returning the current Sale view.
- Transaction orchestration: first execution atomically inserts `PROCESSING`, reads Product, inserts Sale, and marks the idempotency record `SUCCEEDED`; replay expiry/read uses a separate short transaction; failure persistence occurs only after the business transaction rolls back.
- Idempotency: fingerprints operation + product code; serializes by global key; distinguishes conflict, prior failure, and successful replay; returns `created: false` on replay.
- Locking: acquires the global key advisory lock; replay locks the referenced Sale with `SELECT ... FOR UPDATE`.
- Repository coordination: `insertProcessing → findAvailableProduct → insert Sale → markSucceeded`; replay uses `find → findByIdForUpdate → optional markCancelled → findView`.
- Expiry/state transition: creates `expiresAt`; replay persists expiry cancellation.
- Errors: maps missing Product and idempotency states to application errors; propagates unexpected/integrity failures after attempting separate `FAILED` persistence.

### Payment

- Business/state decisions: rejects missing, paid, or cancelled Sales; validates CASH sufficiency or exact QR amount; computes CASH change; creates one Payment; transitions `PENDING → PAID`; returns cancellation instead when expired.
- Transaction orchestration: atomically inserts `PROCESSING`, locks/validates Sale, optionally cancels expiry or inserts Payment and marks Sale paid, then marks idempotency success; failure persistence follows rollback in a separate transaction.
- Idempotency: fingerprints operation + normalized Sale UUID + payment method + amount; replays either an existing Payment or an expired-cancel result; distinguishes conflict and prior failure.
- Locking: acquires the global key advisory lock, then the Sale row lock; this ordering remains unchanged.
- Repository coordination: `insertProcessing → findByIdForUpdate → expiry/state/amount decisions → insertPayment → markPaid → markPaymentSucceeded`, or expiry `markCancelled → markSucceeded`; replay reads the persisted resource referenced by the idempotency row.
- Expiry/state transition: captures request time before lock acquisition and checks expiry both at request time and immediately before Payment persistence/commit.
- Errors: maps missing/state/amount/idempotency cases and propagates unexpected failures after separate `FAILED` persistence.

### Cancel

- Business/state decisions: rejects missing or paid Sales; transitions pending Sales to cancelled; treats an already-cancelled Sale as a successful no-op.
- Transaction orchestration: atomically inserts `PROCESSING`, locks/validates Sale, conditionally cancels it, and marks idempotency success; failure persistence follows rollback separately.
- Idempotency: fingerprints operation + normalized Sale UUID; replays the stored cancelled result; distinguishes conflict and prior failure.
- Locking: acquires the global key advisory lock, then the Sale row lock; ordering remains unchanged.
- Repository coordination: `insertProcessing → findByIdForUpdate → optional markCancelled → markSucceeded`; replay resolves from the idempotency record.
- Expiry/state transition: Cancel does not need a separate time decision because every pending Sale becomes cancelled regardless of expiry.
- Errors: maps missing/paid/idempotency cases and propagates unexpected failures after separate `FAILED` persistence.

## Concrete findings and decisions

### F-01 — Extracted: duplicated advisory-lock mechanism

- Problem: all three services contained the same low-level MySQL mechanism for SHA-256 lock-name construction, dedicated pool connection acquisition, blocking `GET_LOCK`, acquisition verification, `RELEASE_LOCK`, and connection release.
- Affected files: the three service files plus the new `src/application/idempotency-key-lock.ts`.
- Why misplaced/duplicated: services should coordinate that an idempotency-key lock surrounds their workflow, but repeating connection/resource mechanics in every workflow obscures business ordering and creates three maintenance points for failure-safe cleanup.
- New owner: narrow `withIdempotencyKeyLock` application helper.
- Measurable benefit: replaces three identical implementations with one implementation and adds 3 direct unit tests for acquire/execute/release ordering and error cleanup.
- Ordering proof: each service still computes its existing fingerprint first; Payment still captures request time before fingerprint/lock acquisition; the helper retains acquire connection → `GET_LOCK` → workflow callback → `RELEASE_LOCK` → release connection, including nested `finally` cleanup.
- Why not premature: the mechanism had three existing callers and a single idempotency-specific purpose; it is not a generic lock manager, workflow engine, transaction framework, repository abstraction, or speculative interface.

### F-02 — Not extracted: workflow transaction bodies

The services share a broad insert-processing / execute-business-work / mark-succeeded outline, but the exact repository ordering, row locks, expiry decisions, resource references, and results differ. Consolidation would hide behavior-critical sequencing behind a generic workflow abstraction, so the explicit code remains.

### F-03 — Not extracted: replay resolution

Replay superficially checks operation, fingerprint, status, and resource identifiers in all services, but Create Sale must row-lock, persist expiry, and load the current Sale; Payment can resolve a Payment or expired Sale; Cancel returns a cancellation result. A shared resolver would need callbacks and branching that reduce clarity and raise behavior risk.

### F-04 — Not extracted: Sale state/expiry handling

Payment and Cancel both lock a Sale, but their allowed states, errors, expiry semantics, and transitions are workflow-specific. Create Sale applies expiry only during successful replay. The domain predicate `isSaleExpiredAt` is already the appropriate shared rule.

### F-05 — Not extracted: duplicate-entry predicate and failed-record methods

These small blocks remain local. Extracting them alone offers limited clarity, while combining them into a larger idempotency coordinator would move operation-specific timing and parameters behind a premature abstraction.

## Implementation summary

- Added `src/application/idempotency-key-lock.ts` with the narrow shared lock lifecycle.
- Updated Create Sale, Payment, and Cancel services to invoke the helper while keeping their workflow callbacks unchanged.
- Added `tests/unit/idempotency-key-lock.test.ts` with 3 focused tests.
- No dependency, route, controller, DTO, validation, OpenAPI, domain rule, repository, SQL, migration, seed, schema, transaction body, idempotency record algorithm, fingerprint, or runtime configuration changed.

## Files created / modified

- `src/application/idempotency-key-lock.ts`
- `src/application/services/create-sale-service.ts`
- `src/application/services/payment-service.ts`
- `src/application/services/cancel-sale-service.ts`
- `tests/unit/idempotency-key-lock.test.ts`
- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/README.md`
- `docs/prompts/T-013-service-responsibilities.md`

## Baseline gates

Executed before production changes, in required order:

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm test`: PASS — 86 passed, 58 database-context tests skipped as designed.

## Post-change verification

Executed in required order after the refactor:

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm test`: PASS — 89 passed, 58 guarded skips.
- Focused helper test: PASS — 3/3.
- During test development, an intermediate lint run reported six `require-await` errors in the new test doubles; the declarations were corrected without changing production code, and the final ordered lint gate passed.
- Isolated Docker/MySQL full gate: PASS — 147/147.
- `git diff --check`: PASS with expected Windows line-ending warnings only.
- The first sandboxed Docker attempt could not access the user's Docker configuration/engine. The approved retry passed and cleaned up its disposable containers, image, network, and volume.

## Transaction / locking / idempotency / concurrency result

- Transaction callback bodies and `{ connection }` binding are unchanged.
- Business transaction duration, commit/rollback ordering, and separate `FAILED` persistence remain unchanged.
- Advisory lock name, infinite-wait value, dedicated connection, acquisition check, release query, and nested cleanup order are unchanged.
- Payment/Cancel Sale row-lock acquisition and advisory-lock-before-row-lock order are unchanged.
- Fingerprints, global-key behavior, processing/succeeded/failed lifecycle, replay/conflict behavior, and referenced resources are unchanged.
- Docker tests covering same-key serialization, different-key Payment competition, Payment/Cancel races, expiry races, rollback injection, and separate failed persistence all pass.

## API / OpenAPI / Docker result

- Runtime request/response behavior, status/error mapping, validation, controllers, response DTOs, and OpenAPI definitions were not modified.
- OpenAPI tests pass within the host and Docker suites.
- Docker/MySQL full gate passed 147/147, including environment, database, API, idempotency, rollback, locking, and concurrency coverage.

## Final diff review

- Every production change belongs to the documented F-01 advisory-lock extraction; workflow transaction bodies are unchanged.
- No test was removed, skipped, weakened, or rewritten to accept changed behavior; 3 focused tests were added.
- No unnecessary abstraction was introduced, and T-014 repository-boundary work was not started.
- Documentation and audit entries reflect the actual diff and executed results.

## Independent Senior Review / Final Gate — 2026-09-18

### Review scope and result

- Result: PASS.
- Independently reviewed the complete T-013 diff against `HEAD`, the three pre-T-013 service implementations, the new helper/tests, API contract, T-011/T-012 structural baselines, repositories, transactions, idempotency behavior, locks, and integration coverage.
- No applicable `AGENTS.md` exists in the repository or checked parent paths.

### Findings and fixes

- BLOCKER: none.
- MAJOR: none.
- MINOR `T013-SR-001` — `tests/unit/idempotency-key-lock.test.ts`: the implementation-stage tests did not directly exercise a `RELEASE_LOCK` failure, so the helper's nested-`finally` guarantee that the connection is still released and cleanup-error precedence remains unchanged lacked focused regression protection. Impact was test coverage only; the production implementation already matched the pre-T-013 code. Fix: added one test that combines a workflow error with a lock-release error, verifies the connection is released last, and verifies the release error propagates as before. Status: resolved.
- NOTE: the helper retains the existing Knex pool-client `unknown` cast; centralizing the three identical casts is preferable to inventing a T-014 repository/connection abstraction.
- NOTE: the pre-existing Cancel JSON `null` documentation/runtime discrepancy recorded by T-012 remains outside T-013 scope.

### Refactor justification and scope

- The extraction is justified: three services contained the same low-level, failure-sensitive MySQL advisory-lock lifecycle, not merely similar workflow logic.
- `withIdempotencyKeyLock` has one narrow responsibility and three current callers. It reduces three maintenance points to one and now has four direct unit tests without hiding service transactions or business decisions.
- Leaving workflow bodies, replay resolution, separate `FAILED` persistence, state transitions, expiry handling, transaction callbacks, and Sale row locking explicit is the correct scope because those paths have materially different ordering and result semantics.
- No generic manager, workflow engine, transaction framework, repository port/interface, new dependency, SQL rewrite, or T-014 change was introduced.

### Advisory-lock behavioral equivalence

- Connection acquisition remains after each service's fingerprint/time preparation and before the protected `try`; acquisition rejection therefore behaves as before and does not attempt cleanup for a connection that was never acquired.
- Lock names remain SHA-256 of `idempotency:${key}`; timeout remains `-1`; `GET_LOCK` and `RELEASE_LOCK` remain pinned to the same acquired connection.
- The workflow callback runs only after the acquisition result equals `1` and receives the same pinned connection used by each unchanged transaction call.
- The nested `finally` is unchanged in effect: release the advisory lock first, then release the connection even if lock release fails.
- Callback errors propagate when cleanup succeeds. As before, a lock-release error supersedes the callback error, and a connection-release error can supersede an earlier error. No error is swallowed relative to the frozen implementation.
- A non-`1` acquisition result still throws the same message, then attempts lock release and connection release. Connection-use failures still enter identical cleanup. No lock ordering or timing changed.

### Service responsibility assessment

- Create Sale retains product availability, price snapshot, quantity/status/expiry creation, first-write transaction, replay-time Sale row lock and expiry transition, repository ordering, idempotency replay/conflict/failure handling, and application-error propagation.
- Payment retains request-time capture, Sale row lock, state and amount decisions, two-point expiry check, Payment creation, `PENDING → PAID`, expired cancellation, transaction/repository ordering, replay resolution, idempotency lifecycle, and error propagation.
- Cancel retains Sale row locking, missing/paid/already-cancelled decisions, `PENDING → CANCELLED`, transaction/repository ordering, replay resolution, separate failed-record persistence, and error propagation. A separate expiry calculation remains correctly unnecessary because every pending Sale is cancelled.
- No workflow-specific responsibility moved into the helper.

### Test integrity and independent verification

- No existing test file, assertion, expected result, or skip was removed, weakened, or changed for T-013. Test changes only add four focused helper cases.
- Final gates in required order: typecheck PASS; lint PASS; build PASS; host regression PASS — 90 passed, 58 database-guarded skips.
- Focused helper suite PASS — 4/4.
- Complete unit suite PASS — 61/61.
- Focused Create Sale/Payment/Cancel HTTP plus OpenAPI suite PASS — 38/38; OpenAPI specifically 2/2.
- Isolated Docker/MySQL full gate PASS — 148/148 across 17 files. Create Sale integration 13/13, Payment 18/18, Cancel 13/13; these suites include successful and failed idempotency, replay/conflict, rollback/failure injection, advisory-lock waits, Sale row-lock races, expiry races, and cross-workflow concurrency.
- Docker environment verification, migration/seed idempotence, service-name networking, readiness recovery, and volume persistence passed; disposable resources were removed.
- `git diff --check` PASS with expected Windows line-ending warnings only.
- Frozen Behavioral Baseline, T-011 DTO boundary, and T-012 validation boundary are preserved. T-014 remains untouched.

## Remaining risks / findings

- The helper intentionally retains the existing `unknown` cast around Knex's underlying pool client because Knex does not expose the required acquired-connection lifecycle through the public type used here. This code already existed identically in all three services; T-013 centralizes rather than broadens it.
- The pre-existing Cancel JSON `null` documentation/runtime inconsistency recorded by T-012 remains out of T-013 scope.
- No unresolved BLOCKER, MAJOR, or MINOR findings remain.

## Current Task status

DONE — all T-013 acceptance criteria, independent SRG01 review, static/host verification, focused tests, isolated Docker/MySQL full gate, final diff review, and AUD01 pass with no unresolved BLOCKER, MAJOR, or MINOR findings.
