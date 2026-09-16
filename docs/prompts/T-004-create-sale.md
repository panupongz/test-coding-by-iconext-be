# T-004 — Create Sale

## Task ID and title

T-004 — Create Sale

## Objective

Implement Create Sale ให้ validate, snapshotราคา, persistแบบ atomic และรองรับ idempotency/concurrency ตาม approved decisions

## Requirement references

Q009–Q016, Q026–Q029, Q040, Q054–Q080, Q145–Q146; RC01; RC04; RU03; ES01–ES02; ES04–ES05; ES07–ES10; SRG01; AUD01

## Exact user prompt sent to Codex

### Prompt #1 — T-004 implementation

```text
Implement T-004 only.

Before making any code changes:

1. Read AGENTS.md and all relevant project instructions.
2. Read docs/phase-2/IMPLEMENTATION\_CHECKLIST.md and treat the T-004 entry as the primary source of truth.
3. Inspect the existing implementation produced by T-001, T-002, and T-003.
4. Inspect the current database schema, models/entities, services, routes/controllers, validation patterns, transaction patterns, error handling, and tests that are relevant to T-004.
5. Do not assume requirements that are not present in the repository documentation.

Prompt logging requirement:

- Save this exact prompt verbatim in the repository according to the existing prompt-log convention used by T-001/T-002/T-003.
- Follow the existing naming/location convention rather than inventing a new convention.

Then implement T-004 according to the repository's source of truth.

Scope:

- Implement only T-004.
- Implement the Create Sale flow required by T-004.
- Validate product\_code according to the documented requirements.
- Support Idempotency-Key exactly as specified by the project.
- Snapshot the applicable product/price data at sale creation time as required by the specification.
- Create the sale with the required initial PENDING state.
- Set expires\_at according to the documented rule.
- Ensure operations that must be atomic execute inside the appropriate database transaction.
- Preserve existing architecture and coding conventions.
- Add or update tests required to prove T-004 behavior.

Important boundaries:

- Do NOT implement T-005 or any later task.
- Do NOT introduce speculative features or unrelated refactoring.
- Do NOT change established API contracts unless T-004 explicitly requires it.
- Do NOT mark T-004 as completed in IMPLEMENTATION\_CHECKLIST.md yet.
- Do NOT commit or push anything.

Verification:

- Run the relevant automated tests.
- Run any lint/typecheck/build checks applicable to the changed code.
- Check for regressions in existing T-001 through T-003 behavior.
- If a verification command cannot run, report the exact reason instead of hiding or bypassing it.

When finished, stop and report:

1. What you found in the T-004 source of truth.
2. Files changed/created.
3. Implementation summary.
4. How Idempotency-Key is handled.
5. How price/product snapshotting is handled.
6. How PENDING and expires\_at are handled.
7. Transaction/atomicity behavior.
8. Tests added or changed.
9. Commands executed and their exact results.
10. Any assumptions, risks, or unresolved issues.
11. git status --short

Do not commit.
Do not push.
Do not close T-004.
Wait for review.
```

## Additional / follow-up prompts

### Prompt #2 — T-004 Senior Review and Final Gate

```text
Perform the senior review and final gate for T-004 only.

Source of truth:

- docs/IMPLEMENTATION\_CHECKLIST.md
- Relevant repository documentation and existing project conventions
- The current uncommitted T-004 implementation

Review the complete T-004 diff against the documented requirements.

Pay particular attention to:

- Create Sale API contract and exact response/error behavior
- product\_code validation
- Idempotency-Key validation and replay semantics
- same-key/different-request conflicts
- concurrency safety
- price snapshot correctness
- quantity = 1
- initial PENDING status
- created\_at and expires\_at = created\_at + 5 minutes
- transaction boundaries and rollback behavior
- separate FAILED persistence where required
- behavior after sale status changes
- regression risk to T-001 through T-003
- ensuring T-005/T-006 behavior remains outside T-004 scope

Act as a senior reviewer, not merely a test runner.

If you find any issue:

1. Fix it within T-004 scope.
2. Add/update tests where appropriate.
3. Re-run all relevant verification.

Then perform the final gate.

Required verification:

- npm run typecheck
- npm run lint
- npm run build
- npm run test:unit
- npm run test:integration
- npm test
- Run the disposable MySQL test suite if the repository provides it.
- git diff --check
- git diff --cached --check
- git status --short

Only if:

- T-004 matches the source of truth,
- no unresolved correctness issue remains,
- relevant tests pass,
- no T-005+ implementation was introduced,

then update docs/IMPLEMENTATION\_CHECKLIST.md to mark T-004 completed using the repository's existing checklist convention.

Do not commit.
Do not push.
Do not start T-005.

At the end report:

1. Senior review findings.
2. Fixes made, if any.
3. Final verification results.
4. Whether T-004 passed the final gate.
5. Whether T-004 was marked completed.
6. Remaining risks/issues.
7. git status --short.
```

## Codex implementation summary

- Implemented strict Create Sale HTTP validation and the documented Thai error envelope.
- Added controller, service, and repository layers for Product lookup, Sale persistence, replay lookup, deterministic request fingerprinting, and idempotency state persistence.
- Added atomic Sale + successful idempotency writes, separate FAILED persistence after rollback, and database advisory-lock serialization that waits for the original same-key operation's final result (including the failure path).
- Kept Payment and Cancel on their existing `501 Not Implemented` placeholders.

## Files created / modified

- `README.md`
- `docs/prompts/T-004-create-sale.md`
- `src/app.ts`
- `src/server.ts`
- `src/application/errors/application-error.ts`
- `src/application/services/create-sale-service.ts`
- `src/database/repositories/idempotency-repository.ts`
- `src/database/repositories/sale-repository.ts`
- `src/domain/sale.ts`
- `src/http/controllers/create-sale-controller.ts`
- `src/http/middleware/error-handler.ts`
- `src/http/routes/api-routes.ts`
- `tests/integration/create-sale.test.ts`
- `tests/integration/http-foundation.test.ts`
- `tests/unit/create-sale-http.test.ts`

## Tests executed

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:unit`
- `npm run test:integration`
- `npm test`
- Full `npm test` inside the backend container against the isolated `t004-test` MySQL 8.4 Compose database with `NODE_ENV=test` and `DB_TEST_CONTEXT=disposable`
- `git diff --check`

## Test results

- Typecheck, lint, build, and unit tests pass; unit suite: 24/24.
- Host full suite passes 35 tests with 22 live-database tests safely skipped outside the disposable context.
- Host integration command passes 11 tests with 22 live-database tests safely skipped.
- Clean disposable MySQL full suite passes 57/57, including all 9 T-004 integration tests and the T-001–T-003 regression suites.
- `git diff --check` passes; Git only reports its normal LF-to-CRLF working-copy warnings.
- The first disposable run identified test-only collation and fixture-isolation defects. The harness was corrected to use explicit SQL `LIKE` and isolated P901–P905 fixtures; the database was recreated and the clean full rerun passed.

## Senior Review findings

- SRG01-T004-001 — MAJOR — FIXED: the initial 30-second advisory-lock timeout could return `500` instead of waiting for the original same-key operation's final status. Changed `GET_LOCK` to MySQL's documented negative-timeout/infinite-wait mode.
- Verified Create Sale response/error contract, strict input validation, deterministic fingerprinting, current-state replay, different-request conflicts, Product/price handling, quantity/status/timestamps, success and failure transaction boundaries, concurrency, regression scope, and T-005/T-006 exclusion.
- No unresolved BLOCKER, MAJOR, or MINOR findings.
- `SRG01: PASS`

## Fixes made after review

- Replaced the bounded 30-second idempotency advisory-lock timeout with infinite waiting so concurrent same-key requests always wait for the first operation's final status as required.
- Re-ran all required host checks and the clean disposable MySQL suite after the fix.

## Final Task status

DONE — SRG01 and Final Gate passed; prompt audit and checklist closure completed.
