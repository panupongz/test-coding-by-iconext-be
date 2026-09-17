# T-009 — Unit / Integration Tests

## Task ID and title

T-009 — Unit / Integration Tests

## Objective

สร้าง unit/integration test suite ที่พิสูจน์ business behavior, database effects, concurrency และ Docker environment

## Requirement references

Q001–Q149; RC01–RC04; RU01–RU08; AD01; TECH01–TECH04; ES11; SRG01; AUD01

## Exact user prompt sent to Codex

### Prompt #1

```text
You are implementing T-009 for the backend project.

## Source of Truth

Read and follow:

- `docs/IMPLEMENTATION_CHECKLIST.md`
- Existing implementation from T-001 through T-008
- Existing project conventions and test structure

Treat `docs/IMPLEMENTATION_CHECKLIST.md` as the authoritative source for T-009 scope and acceptance criteria.

## Task

Implement **T-009 — Unit / Integration Tests**.

Before changing code:

1. Read the T-009 section in `docs/IMPLEMENTATION_CHECKLIST.md`.
2. Inspect the current implementation from T-001 through T-008.
3. Inspect existing tests, scripts, database setup, migrations, and test utilities.
4. Determine the minimum changes required to satisfy T-009.
5. Do not redesign already completed tasks unless a real defect prevents T-009 from passing.

## Implementation Requirements

Add or update automated tests required by T-009.

Tests must cover the relevant backend behavior defined by the checklist, including applicable cases around:

- product behavior
- sale creation
- payment
- cancellation
- expiration
- validation and error responses
- idempotency
- transaction behavior
- database constraints introduced through T-008

Verify both successful and failure paths where required by the checklist.

For integration tests, verify actual API/database behavior rather than only mocking internal functions when practical.

Tests must be deterministic and isolated.

Do not weaken production validation, database constraints, transaction handling, or business rules merely to make tests pass.

## Scope Control

Do NOT:

- implement future tasks
- introduce unrelated refactoring
- change API contracts without checklist justification
- change business rules just to satisfy tests
- remove existing database constraints
- commit or push changes

If an existing implementation defect from T-001–T-008 is discovered and directly prevents T-009 from passing, make the smallest safe fix and clearly report it.

## Verification

Run the project's relevant automated test suite.

Also run any existing:

- type check
- build
- lint
- database/integration verification

that is applicable to this repository.

Confirm there are no regressions in previously completed T-001–T-008 behavior.

## Prompt Audit

Preserve this prompt verbatim according to the project's existing prompt-audit convention.

Use:

`docs/prompts/T-009-testing.md`

Follow the same structure/convention already used by previous task prompt files.

Do not invent a new prompt-log format.

## Final Report

When finished, report:

1. Files changed
2. Tests added/updated
3. Test scenarios covered
4. Commands executed
5. Test/build/typecheck/lint results
6. Any defect from T-001–T-008 discovered and fixed
7. Any remaining risks or findings
8. Whether T-009 is ready for Senior Review / Final Gate

Do not mark T-009 DONE yet.\
Do not commit or push.
```

## Additional / follow-up prompts

### Prompt #2

```text
Perform the Senior Review / Final Gate for T-009.

## Source of Truth

Read:

- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/T-009-testing.md`
- `docs/TEST_MATRIX.md`
- all code and tests changed for T-009
- relevant implementation from T-001 through T-008

Review the actual repository state and git diff. Do not rely only on the previous implementation report.

## Review Goals

Verify that T-009 fully satisfies its checklist acceptance criteria and that the test suite provides meaningful coverage rather than merely passing.

Pay particular attention to:

- product seed/schema constraints
- create sale
- payment
- cancellation
- expiration
- validation/error contracts
- idempotency and replay behavior
- changed-request conflicts
- failed-key retry behavior
- transaction rollback
- FAILED-state persistence
- deterministic MySQL-observed concurrency
- TECH01–TECH04
- Docker/Compose lifecycle
- MySQL health/readiness
- backend-container migration/seed/test execution
- named-volume persistence
- isolation and determinism of test fixtures

Review the two fixture-only fixes made for the pre-existing T-003 and T-005 tests and confirm they do not hide or weaken production behavior.

## Quality Review

Check for:

- false-positive tests
- tests that assert implementation details instead of behavior
- excessive mocking where real integration behavior is required
- flaky timing assumptions
- shared-state leakage
- incorrect DB cleanup
- weakened assertions
- skipped tests that should actually execute
- production-code changes made only to satisfy tests
- unnecessary scope expansion

Inspect all T-009 production-code changes carefully.

Any production-code modification must be justified by actual required behavior.

## Verification

Run the relevant verification again, including:

- `npm run test:unit`
- `npm run test:docker`
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`

Inspect `git diff` and `git status`.

Do not commit or push.

## Decision

If a real issue is found:

1. Fix only issues necessary for T-009.
2. Re-run affected verification.
3. Report exactly what was fixed.
4. Keep T-009 in REVIEW if any unresolved issue remains.

If no blocking issue remains and all T-009 acceptance criteria are satisfied:

1. Update `docs/IMPLEMENTATION_CHECKLIST.md` according to the project's existing convention.
2. Mark T-009 DONE.
3. Do not start T-010.
4. Do not commit or push.

## Final Report

Report concisely:

1. Senior Review findings
2. Any fixes made during review
3. Final verification results
4. `git diff --check` result
5. Remaining risks, if any
6. Final T-009 status: DONE or REVIEW

Do not commit or push.
```

## Codex implementation summary

- Added focused unit tests for integer CASH/change, exact QR equality, inclusive expiration boundaries, and exact Sale/Payment response mapping. Existing pattern, request-fingerprint, HTTP mapping, validation, and error tests remain part of the same suite.
- Added a complete T-001–T-008 test trace matrix with expected HTTP/body/database/environment state.
- Added a repeatable isolated Docker environment verifier for Compose configuration/build/start, MySQL 8.4 health, backend service-name networking, readiness withholding/recovery, backend-container migration/seed/full tests, and named-volume persistence.
- Reused the existing real-MySQL API suites for success/failure, replay/conflict/failed retry, transaction rollback, separately persisted `FAILED`, deterministic database-observed concurrency, and database constraints.
- Extracted the existing payment arithmetic and expiration comparisons into directly testable pure helpers without changing their business behavior or API contracts.
- The first full Docker run exposed two pre-existing test-isolation defects; both received minimal fixture-only fixes and the complete environment was rerun successfully.
- Independent Senior Review found and fixed one readiness-verification false positive, strengthened exact seed counting, and verified isolated image cleanup before Final Gate closure.

## Files created / modified

- `package.json` — added `test:docker`.
- `src/application/services/payment-service.ts` — exposed the existing payment calculation as a pure helper and used the shared expiry predicate.
- `src/application/services/create-sale-service.ts` — used the shared expiry predicate.
- `src/domain/sale.ts` — added the pure inclusive expiry predicate.
- `tests/unit/business-rules.test.ts` — focused money, QR, expiry, and response-mapping tests.
- `tests/integration/product-seed.test.ts` — isolated canonical seed state inside each rollback transaction.
- `tests/integration/payment.test.ts` — made fixed-time fixtures derive a valid `created_at` from `expires_at`.
- `tests/environment/verify-docker-environment.js` — isolated Docker/Compose lifecycle verification.
- `docs/TEST_MATRIX.md` — T-001–T-008 test trace matrix and TECH/RC/RU trace.
- `docs/IMPLEMENTATION_CHECKLIST.md` — T-009 evidence and `REVIEW` status.
- `docs/prompts/T-009-testing.md` — verbatim prompt and implementation audit.

## Tests executed

- `npm run test:unit`
- `npm run typecheck`
- `npm run lint`
- `npm run test:docker` (initial diagnostic run and complete post-fix rerun)
- `npm test`
- `npm run build`
- `git diff --check`
- Senior Review repeated every command above after strengthening the Docker verifier.

## Test results

- Unit suite: PASS — 55/55 tests in 8 files.
- Initial Docker full suite: expected diagnostic failure — 139 passed, 3 failed; it reproduced seed-state leakage in two tests and a live-clock/fixed-time fixture conflict in one expiry test. The isolated project and volume were removed.
- Post-fix isolated Docker/MySQL 8.4 suite: PASS — 142/142 tests in 15 files, including all integration, rollback, replay, constraint, and concurrency cases.
- Docker environment verification: PASS — exact services/config, MySQL 8.x health, backend host `mysql`, withheld-DB unready state, recovery after DB health, backend-container migration/seed/test commands, and data survival after MySQL container recreation all passed; cleanup removed the isolated project and volume.
- Host regression: PASS — 84 passed and 58 database-context-guarded skips, 142 total in 15 files.
- Typecheck: PASS.
- Lint: PASS.
- Build: PASS.
- `git diff --check`: PASS; only line-ending conversion warnings were emitted.
- TC-009.1–TC-009.8: PASS.
- Senior Review rerun: unit 55/55; disposable MySQL/backend-container 142/142; host 84 passed with 58 expected guarded skips; typecheck/lint/build PASS.

## Senior Review findings

Independent SRG01 result: `PASS` after fix and re-review.

- `SRG01-T009-001` — **MEDIUM — VERIFIED FIXED**
  - Affected location: `tests/environment/verify-docker-environment.js`, withheld-MySQL readiness assertion.
  - Evidence: the verifier sampled Docker health after two seconds, but the backend healthcheck has a five-second interval and start period. An incorrectly early HTTP listener could still have health status `starting`, allowing TC-009.8 to pass falsely.
  - Minimal fix: execute the actual TCP listener probe inside the backend container while MySQL is absent and require connection failure; retain the later Docker healthy assertion after MySQL recovery.

The review also strengthened the fresh-seed assertion from counting only P001–P005 to counting the entire Product table, proving exactly five total rows, and made isolated Docker cleanup remove the locally built project image. These are assertion/cleanup improvements associated with the same verifier review, not additional production defects.

Post-fix review found no unresolved BLOCKER, HIGH, MEDIUM, MAJOR, or MINOR finding. API/database behavior, transaction and separate `FAILED` persistence, deterministic MySQL-observed locks, TECH01–TECH04, fixture isolation, and production helper extractions were inspected. The helper extractions preserve the original comparisons/calculation exactly and are justified by the required focused unit coverage.

## Fixes made after review

Senior Review fixes:

- Replaced the timing-sensitive Docker health-status sample with a direct TCP listener assertion while MySQL is withheld.
- Changed the fresh container seed assertion to require exactly five total Product rows.
- Added removal of the isolated locally built backend image during Docker cleanup.

Implementation verification had previously found and fixed two pre-existing test defects:

- Product seed tests depended on canonical products being absent before the file ran. Each test now removes those rows inside its own transaction, which is rolled back afterward, so the suite is isolated from a required prior `db:seed` run.
- A Payment expiry test mixed fixed September 2026 expiry times with live-clock `created_at`. Payment fixtures now derive `created_at` as five minutes before their supplied `expires_at`, satisfying the real schema constraint deterministically.

No production business defect or API contract defect from T-001–T-008 was found.

## Final Task status

DONE — TC-009.1–TC-009.8, independent SRG01, full Docker/MySQL verification, host regression, typecheck, lint, build, audit, and Final Gate all pass. T-010 was not started.
