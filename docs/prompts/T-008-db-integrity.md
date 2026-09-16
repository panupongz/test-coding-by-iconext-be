# T-008 — Transaction + FK + Unique Index

## Task ID and title

T-008 — Transaction + FK + Unique Index

## Objective

บังคับ business atomicity, row locking และ database integrity สำหรับ critical write flows

## Requirement references

Q057–Q075, Q084–Q086, Q105–Q108, Q117–Q121, Q137–Q139, Q144–Q147; RC01–RC04; RU01; ES03–ES06; ES11; SRG01; AUD01

## Exact user prompt sent to Codex

### Prompt #1

```text
You are implementing **T-008 — Transaction + FK + Unique Index** for this backend repository.

## Source of Truth

Read and follow these files before making changes:

* `docs/IMPLEMENTATION_CHECKLIST.md`
* `AGENTS.md` and any applicable nested `AGENTS.md`
* existing implementation and tests from T-001 through T-007
* existing prompt audit files under `docs/prompts/`

Treat the current requirements, RC01–RC04, RU01, ES03–ES06, ES11, SRG01, and AUD01 in `docs/IMPLEMENTATION_CHECKLIST.md` as authoritative.

Do not reintroduce superseded requirements.

## Objective

Complete T-008 by verifying and, only where necessary, implementing the transaction, locking, idempotency, concurrency, FK, and unique-constraint behavior across the existing Create Sale, Payment, Cancel, and expiration flows.

Preserve all behavior already completed in T-001 through T-007.

Do not refactor unrelated code.

## Required T-008 behavior

Ensure that:

1. Every critical business write uses a transaction and MySQL's default isolation level.

2. Existing database integrity is enforced by the required FK and unique constraints, including:

   * Product code uniqueness
   * Idempotency key uniqueness
   * Payment Sale ID uniqueness
   * required foreign keys

3. Successful Sale, Payment, Cancel, expiration transition, and successful idempotency state commit atomically where required.

4. When an operation fails:

   * rollback the business transaction completely;
   * persist the idempotency record/status as `FAILED` using a separate transaction in the same database;
   * retrying that failed key returns `409`.

5. Request identity uses a deterministic canonical fingerprint/hash.

   * same logical request must produce the same identity;
   * different request must produce a different identity;
   * do not persist the full HTTP response body merely for idempotency.

6. Concurrent same-key/same-request operations must wait for the first operation's final result and must not execute the business operation twice.

7. Same key + different request must return `409`.

8. Payment must lock the Sale row using an appropriate row-level lock such as `SELECT ... FOR UPDATE`.

9. Transactions must remain short and scoped to the required business operation.

10. Concurrent Payments using different idempotency keys against the same Sale must result in at most one successful Payment row.
    The database unique constraint on `payments.sale_id` remains the final integrity guard.

11. Preserve the previously implemented persisted expiration behavior and all RC01–RC04 semantics.

## Tests

Implement or strengthen deterministic tests for all T-008 acceptance criteria, especially:

* TC-008.1 — injected error during a business transaction causes all business writes to rollback.
* TC-008.2 — after rollback, idempotency becomes `FAILED` via a separate transaction; retry returns `409`.
* TC-008.3 — FK and unique constraints reject orphan/duplicate data.
* TC-008.4 — concurrent same-key/same-request Create Sale, Payment, and Cancel execute the business operation only once and waiting requests receive the final result; same key/different request returns `409`.
* TC-008.5 — concurrent Payment with different keys against the same Sale produces only one Payment row.

Concurrency tests must be deterministic. Use synchronization/barriers/hooks where appropriate rather than relying only on timing or arbitrary sleeps.

Also run all relevant existing regression tests from T-001 through T-007.

## Engineering constraints

Follow the existing architecture:

Route → Controller → Service/Use Case → Repository/Data Access → MySQL

Business transaction/idempotency/concurrency orchestration belongs in the Service/Use Case layer.

SQL, row locks, and persistence belong in the Repository/Data Access layer.

Keep strict TypeScript.

Do not introduce `any` without a documented unavoidable reason.

Do not add unnecessary abstractions, dependencies, frameworks, APIs, authentication, authorization, schedulers, or unrelated functionality.

Do not weaken existing validation, Thai error responses, security behavior, or tests merely to make T-008 pass.

Do not modify schema/migrations unless an actual T-008 requirement is missing from the existing T-002 implementation.

Prefer the smallest correct change.

## Verification

Run the repository's applicable commands for:

* T-008 focused tests
* relevant integration/concurrency tests against MySQL
* full unit/integration regression suite where supported
* typecheck
* lint
* build
* `git diff --check`

Use the project's existing Docker/MySQL testing strategy where required.

Do not claim a test passed unless you actually executed it.

## Prompt audit

Update/create the appropriate T-008 prompt audit file under `docs/prompts/`.

Record this implementation prompt verbatim according to AUD01.

Record:

* implementation summary
* files changed
* tests actually executed
* actual results
* unresolved issues, if any

Do not mark T-008 `DONE` yet.

After implementation and tests pass, set it only to the appropriate pre-review status according to the checklist workflow. T-008 becomes `DONE` only after SRG01/Final Gate requirements are satisfied.

## Final response

When finished, report concisely:

1. what you changed;
2. files changed;
3. TC-008.1–TC-008.5 result;
4. regression/typecheck/lint/build/diff-check results;
5. current T-008 status;
6. anything that still requires Senior Review / Final Gate.

Do not perform unrelated cleanup.
```

## Additional / follow-up prompts

### Prompt #2

```text
Perform the **independent SRG01 Senior Review and Final Gate for T-008 — Transaction + FK + Unique Index**.

## Source of Truth

Read and follow:

- `docs/IMPLEMENTATION_CHECKLIST.md`
- `AGENTS.md` and applicable nested `AGENTS.md`
- `docs/prompts/T-008-db-integrity.md`
- the actual T-008 implementation and tests
- relevant existing T-001–T-007 implementation/tests

Do not trust the previous implementation summary as proof. Independently inspect the actual code, database behavior, and tests.

## Review scope

Review T-008 specifically for:

- transaction boundaries and atomicity
- rollback correctness
- separate persistence of idempotency `FAILED`
- deterministic canonical request fingerprinting
- same-key/same-request concurrency
- same-key/different-request conflict behavior
- Payment row locking / `SELECT ... FOR UPDATE`
- concurrent Payments using different keys
- FK and unique constraints
- MySQL default isolation behavior
- short transaction boundaries
- RC01–RC04 and RU01 compliance
- regressions against T-001–T-007
- ES03–ES06 and ES11 compliance
- scope creep or unnecessary abstractions

Pay special attention to whether concurrency tests prove real overlap deterministically rather than merely passing because of timing.

Verify that successful business writes and successful idempotency state commit atomically.

Verify that injected failures cannot leave partial business state.

Verify that `FAILED` persistence really occurs only after the failed business transaction has rolled back.

Verify that the database unique constraint remains the final guard preventing multiple Payments for one Sale.

Verify the canonical fingerprint cannot produce different identities merely because of unstable serialization/order for logically identical supported requests.

## Findings

Classify findings using the project's SRG01 severity conventions.

For every finding provide:

- ID
- severity
- affected file/location
- concrete evidence
- why it violates the Source of Truth
- minimal required fix

Do not invent findings merely to produce review output.

## Fix policy

If any BLOCKER, HIGH, MEDIUM, MAJOR, or other finding that prevents SRG01 completion is found:

1. implement the smallest correct fix;
2. add/update regression tests where appropriate;
3. rerun all affected T-008 tests;
4. rerun relevant T-001–T-007 regressions;
5. repeat the review of the changed area.

Continue until no unresolved finding remains that prevents T-008 completion.

Do not perform unrelated refactoring.

## Final verification

Run, using the repository's real supported environment:

- T-008 focused tests / TC-008.1–TC-008.5
- relevant live/disposable MySQL integration and concurrency tests
- relevant T-001–T-007 regression tests
- full supported test suite
- typecheck
- lint
- build
- `git diff --check`

Do not claim PASS for anything not actually executed.

Check the working tree and distinguish pre-existing unrelated changes from T-008 changes. Do not modify unrelated pre-existing changes merely to obtain a clean tree.

## Audit and checklist

Append this prompt verbatim to the T-008 prompt audit trail according to AUD01.

Record:

- Senior Review findings
- fixes performed
- tests/reruns and actual results
- final SRG01 result
- Final Gate result

Only if:

- T-008 acceptance criteria pass;
- TC-008.1–TC-008.5 pass;
- required regressions pass;
- no unresolved SRG01 finding prevents completion;
- typecheck/lint/build/diff-check pass;
- documentation and prompt audit are complete;

then update `docs/IMPLEMENTATION_CHECKLIST.md` and mark **T-008 = DONE**.

Otherwise leave T-008 in `REVIEW` or the appropriate non-DONE status and state exactly what remains.

## Final response

Report concisely:

1. SRG01 result;
2. findings and fixes;
3. TC-008.1–TC-008.5 results;
4. MySQL/concurrency/regression results;
5. typecheck/lint/build/`git diff --check`;
6. audit/checklist updates;
7. final T-008 status.

Do not begin T-009.
```

## Codex implementation summary

- Replaced three duplicated request-hash implementations with one canonical SHA-256 helper that sorts logical request fields and includes the operation type.
- Preserved the existing per-idempotency-key MySQL advisory-lock strategy, pinned connection ownership, atomic success transactions, separate failure transactions, Sale row locks, persisted expiration, and database constraints.
- Added deterministic Create Sale synchronization hooks and replaced the timing-only concurrent Create test with an explicit overlap barrier.
- Added Create Sale failure injection after the Sale insert and after the successful idempotency update to prove rollback at both write boundaries, separate `FAILED` persistence, and retry conflict behavior.
- Added unit coverage for canonical identity and integration coverage that the transaction session inherits MySQL's configured default isolation.
- Independent SRG01 review found and fixed non-idempotency duplicate errors bypassing RC04, concurrency tests that did not observe the actual database wait, and UUID-case instability in Payment/Cancel request identities.
- Updated the transaction/integrity design documentation and closed T-008 as `DONE` after the post-fix Final Gate.
- No migration, schema, dependency, API, validation, Thai error, or T-001–T-007 behavior was changed.

## Files created / modified

- `src/application/request-fingerprint.ts` — shared canonical SHA-256 request identity
- `src/application/services/create-sale-service.ts` — shared fingerprint use plus deterministic test/failure hooks
- `src/application/services/payment-service.ts` — shared fingerprint use
- `src/application/services/cancel-sale-service.ts` — shared fingerprint use
- `tests/unit/request-fingerprint.test.ts` — same-logical/different-logical request identity coverage
- `tests/integration/create-sale.test.ts` — deterministic same-key overlap and final-boundary rollback coverage
- `tests/integration/payment.test.ts` — database-observed lock waits, duplicate-Payment-ID RC04, and UUID-case replay coverage
- `tests/integration/cancel-sale.test.ts` — database-observed lock waits and UUID-case replay coverage
- `tests/integration/database-schema.test.ts` — configured-default isolation assertion
- `tests/support/database-lock-wait.ts` — bounded state-based observation of actual MySQL advisory- and Sale-row-lock waits
- `README.md` — transaction, idempotency, lock, and integrity design
- `docs/IMPLEMENTATION_CHECKLIST.md` — T-008 evidence and `REVIEW` status
- `docs/prompts/T-008-db-integrity.md` — verbatim prompt and audit results

Pre-existing `package-lock.json` changes were not modified as part of T-008.

## Tests executed

- `npm run test:unit`
- `npm run typecheck`
- `npm run lint`
- `docker compose build backend`
- `docker compose run --rm -e NODE_ENV=test -e DB_TEST_CONTEXT=disposable backend npm test -- tests/unit/request-fingerprint.test.ts tests/integration/database-schema.test.ts tests/integration/create-sale.test.ts tests/integration/payment.test.ts tests/integration/cancel-sale.test.ts`
- `docker compose run --rm -e NODE_ENV=test -e DB_TEST_CONTEXT=disposable backend npm test`
- `npm test`
- `npm run build`
- `git diff --check`
- Pre-fix duplicate-source reproduction: focused Create Sale and Payment cases
- Duplicate-source disproof controls: normal replay and non-duplicate rollback cases
- Post-fix duplicate-source rerun
- Targeted database-observed advisory-/row-lock concurrency rerun
- Pre-fix and post-fix UUID-case Payment/Cancel replay runs

## Test results

- Unit suite: PASS — 48/48 tests in 7 files.
- Pre-fix duplicate-source reproduction: expected failure — 2/2 cases proved Sale/Payment ID duplicate errors left no `FAILED` row.
- Duplicate-source disproof controls: PASS — 3/3; normal idempotency replay and non-duplicate rollback behavior were intact.
- Post-fix duplicate-source rerun: PASS — 2/2; `FAILED` persisted and retry returned `409`.
- Database-observed Payment lock tests: PASS — 2/2; MySQL showed the second request waiting on the advisory lock or submitted `SELECT ... FOR UPDATE` before the first request was released.
- Pre-fix UUID-case reproduction: expected failure — 2/2 replays returned `409`; post-fix rerun: PASS — 2/2 returned the original result.
- Focused T-008 live MySQL 8.4 suite: PASS — 56/56 tests in 5 files.
- Full disposable MySQL 8.4 regression: PASS — 135/135 tests in 14 files.
- Host regression: PASS — 77 passed, 58 database-context-guarded skips, 135 total in 14 files.
- Typecheck: PASS.
- Lint: PASS.
- Build: PASS.
- `git diff --check`: PASS; only Git line-ending conversion warnings were emitted.
- TC-008.1: PASS — injected failures after business and successful-idempotency writes rolled back all business writes.
- TC-008.2: PASS — `FAILED` persisted separately and retry returned `409`.
- TC-008.3: PASS — Product code, Payment Sale ID, and idempotency key duplicates plus orphan FK rows were rejected by MySQL.
- TC-008.4: PASS — MySQL-observed same-key Create Sale, Payment, and Cancel waits executed once and returned the committed final result; different requests returned `409`.
- TC-008.5: PASS — MySQL-observed different-key Payment row-lock contention produced one Payment row and one successful response; the direct unique-constraint test also rejects a second Payment for one Sale.

## Senior Review findings

Independent SRG01 review result: `PASS` after fixes and re-review.

- `SRG01-T008-001` — **MAJOR — VERIFIED FIXED**
  - Affected locations: duplicate-error catch paths in `src/application/services/create-sale-service.ts`, `payment-service.ts`, and defensively `cancel-sale-service.ts`.
  - Evidence: fixed generated Sale ID and Payment ID collisions produced `ER_DUP_ENTRY`; the business transaction rolled back, but no `FAILED` idempotency row existed because every duplicate was sent directly to replay resolution.
  - Source violation: RC04 and ES05 require every failed operation to persist terminal `FAILED` in a separate transaction after business rollback.
  - Minimal fix: after rollback, treat a duplicate as replay only when the idempotency key is readable; otherwise persist `FAILED` separately and rethrow the original error. Added Sale-ID and Payment-ID collision regressions plus failed-key retry assertions.
- `SRG01-T008-002` — **MAJOR — VERIFIED FIXED**
  - Affected locations: same-key and Sale-row contention cases in `tests/integration/create-sale.test.ts`, `payment.test.ts`, and `cancel-sale.test.ts`.
  - Evidence: the former barriers fired immediately before `GET_LOCK` or `SELECT ... FOR UPDATE`, so the first request could be released before the second query reached MySQL; a pass did not prove an actual wait.
  - Source violation: TC-008.4/TC-008.5 and ES06/ES11 require deterministic real-overlap concurrency evidence rather than timing assumptions.
  - Minimal fix: added `tests/support/database-lock-wait.ts` using bounded `SHOW FULL PROCESSLIST` state polling; tests now release the first operation only after MySQL exposes `State = User lock` for the exact key or the exact Sale's active `FOR UPDATE` query. Removed the obsolete pre-query hooks.
- `SRG01-T008-003` — **MAJOR — VERIFIED FIXED**
  - Affected locations: Payment and Cancel fingerprint construction in their service files.
  - Evidence: the same fixed UUID in lowercase then uppercase addressed the same Sale under MySQL's collation, but same-key replay returned `409` because the fingerprints differed.
  - Source violation: ES05 and T-008 require identical supported logical requests to have identical canonical identities.
  - Minimal fix: lowercase `sale_id` only for Payment/Cancel identity construction and add fixed-UUID HTTP replay regressions.

Post-fix re-review found no new BLOCKER, HIGH, MEDIUM, MAJOR, or MINOR findings. Transaction/rollback ordering, success atomicity, row locking, FK/unique enforcement, default isolation, RC01–RC04, RU01, regression scope, and unnecessary-abstraction concerns were re-inspected.

## Fixes made after review

- Distinguished idempotency-key duplicates from other database unique failures before replay resolution.
- Added RC04 coverage for generated Sale/Payment identifier collisions and verified retry `409`.
- Replaced pre-query concurrency signals with database-observed MySQL advisory- and row-lock wait assertions; removed the unused hooks.
- Canonicalized UUID casing for Payment/Cancel request identity and added replay regressions.
- Re-ran all affected tests, the focused T-008 suite, the full disposable-MySQL regression, host regression, typecheck, lint, build, and diff check.

## Final Gate

Final Gate result: `PASS`.

- Acceptance criteria and TC-008.1–TC-008.5: PASS.
- Independent SRG01: PASS; all three MAJOR findings are verified fixed, with no unresolved closure-blocking finding.
- Live MySQL focused and full regression suites: PASS.
- Host regression, typecheck, lint, build, and `git diff --check`: PASS.
- Prompt #2 is appended verbatim and checklist/audit closure is complete.
- The unrelated pre-existing `package-lock.json` modification remains untouched.

## Final Task status

DONE
