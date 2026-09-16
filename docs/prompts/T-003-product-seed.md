# T-003 — Product Seed แบบ Idempotent

## Task

T-003 — Product Seed แบบ Idempotent

## Requirement references

- Q041–Q053
- Q142–Q143
- RU05–RU06
- RU08
- AD01
- ES03
- ES11
- SRG01
- AUD01

## Exact user prompt sent to Codex

Recorded at: 2026-09-17 02:13:19 +07:00

Purpose: Initial T-003 implementation.

### Prompt #1 — Initial T-003 Product Seed Implementation

```text
You are implementing task T-003 — Product Seed in the `iconext-test-be` repository.

Before making any code changes, inspect the repository and treat the repository documentation as the source of truth.

Read all relevant project documentation, including the task/checklist documentation, requirements, acceptance criteria, database/schema documentation, existing migrations/models/seeding conventions, AGENTS.md files if present, and the completed T-001/T-002 implementation that T-003 depends on.

Also inspect the current Git state before editing.

## Task

Implement T-003 — Product Seed only.

The expected scope includes:

- Seed exactly 5 mock products: P001, P002, P003, P004, and P005.
- Use integer THB prices according to the documented product definitions.
- Use relative image paths according to the repository requirements.
- The seed operation must be idempotent.
- Re-running the seed with the same product data must not create duplicates or corrupt existing data.
- If an existing seeded product has data that conflicts with the canonical seed definition, handle it according to the documented requirement: the changed existing product must be rejected rather than silently overwritten.
- Respect the database schema, constraints, indexes, relationships, and migration behavior established by T-002.
- Follow the existing project architecture, naming conventions, TypeScript/Node conventions, database access pattern, scripts, and test conventions already present in the repository.

Do not implement functionality belonging to T-004 or later tasks.

Do not redesign or refactor unrelated parts of the project.

Do not modify existing T-001/T-002 behavior unless a change is strictly required by the documented T-003 requirements. If such a change appears necessary, stop and report it instead of making an assumption.

## Prompt Audit

Preserve this implementation prompt verbatim in:

`docs/prompts/T-003-product-seed.md`

Follow the repository's established prompt-audit format.

Do not include secrets, credentials, tokens, or environment-sensitive values in the audit document.

Any follow-up prompts used for T-003 must later be appended verbatim to the same audit document.

## Verification

After implementation:

1. Run the relevant automated tests.
2. Run any applicable lint/typecheck/build checks defined by the repository.
3. Verify the seed against the actual database/runtime environment if the repository provides an established Docker/database verification workflow.
4. Verify that exactly P001–P005 are seeded as required.
5. Verify that running the seed repeatedly is idempotent.
6. Verify that the same canonical product data does not create duplicates.
7. Verify the required behavior when an existing seeded product has conflicting/changed data.
8. Verify integer THB price values.
9. Verify relative image paths.
10. Check the final Git diff and Git status.

Do not weaken or remove existing tests just to make the implementation pass.

## Completion Rules

Do NOT:

- mark T-003 as DONE/Completed,
- perform the final task closure,
- create a Git commit,
- push changes,
- implement T-004 or later functionality.

Task closure will happen only after implementation, testing, Senior Review, any required fixes/retests, prompt/checklist audit, and Final Gate.

## Final Report

When finished, report:

1. Repository documentation/files inspected.
2. T-003 requirements and acceptance criteria you identified.
3. Files created or modified.
4. Implementation summary.
5. Seeded product definitions for P001–P005.
6. How idempotency is enforced.
7. How conflicting existing product data is detected/rejected.
8. Tests/checks executed.
9. Test/check results.
10. Database/runtime verification performed and results.
11. Any assumptions, ambiguities, or deviations.
12. Confirmation that no T-004+ functionality was implemented.
13. Final `git status --short`.

Stop after reporting the implementation and verification results. Do not commit.
```

## Additional / follow-up prompts

### Prompt #2 — T-003 Senior Review

```text
You are performing the Senior Review for T-003 — Product Seed in the `iconext-test-be` repository.

T-003 has already been implemented and tested. This step is REVIEW ONLY.

Do NOT modify any files.
Do NOT fix any issues.
Do NOT stage, commit, or push anything.
Do NOT mark T-003 as DONE/Completed.
Do NOT implement T-004 or later functionality.

## 1. Establish the source of truth

Inspect the repository documentation and current implementation, including at minimum:

- docs/IMPLEMENTATION_CHECKLIST.md
- docs/prompts/T-003-product-seed.md
- README.md
- package.json
- relevant requirement/architecture documentation
- T-001/T-002 database/migration implementation that T-003 depends on
- src/database/seeds/202609170001_seed_products.ts
- tests/integration/product-seed.test.ts
- vitest.config.ts
- any other files changed by the T-003 implementation
- current git diff and git status

Use the documented T-003 requirements and acceptance criteria as the source of truth.

## 2. Review the implementation

Perform a Senior Developer-level review of T-003.

Review specifically for:

### Correctness
- Exactly P001–P005 use the canonical documented product data.
- Prices are positive integer THB values.
- Image paths follow the documented relative-path format.
- Existing exact canonical rows remain unchanged.
- Missing canonical products are inserted correctly.
- Repeated execution is idempotent.
- Existing conflicting canonical data is rejected rather than overwritten.
- Soft-deleted canonical products are handled according to the documented requirement.
- Conflict detection covers every canonical field that must remain immutable.
- No partial seed state can remain after failure.
- Transaction behavior is correct.

### Database safety
- Queries and locking behavior are appropriate for MySQL and the project's Knex setup.
- Constraints and indexes established by T-002 are respected.
- The implementation does not introduce race-condition or duplicate-row risks that are reasonably preventable within T-003 scope.
- Transaction boundaries and rollback behavior are correct.
- Seed behavior remains deterministic.

### Code quality
- TypeScript types are appropriate.
- Error handling is clear and safe.
- Naming and structure match repository conventions.
- No unnecessary complexity or unrelated refactoring was introduced.
- No hidden dependency on execution order exists beyond documented migration/seed behavior.

### Tests
Review whether the T-003 tests adequately prove:
- exact P001–P005 data,
- integer prices,
- relative image paths,
- first-run insertion,
- repeated-run idempotency,
- preservation of existing matching rows/IDs,
- partial pre-existing canonical state,
- conflicting existing data,
- soft-deleted canonical data where required,
- transactional rollback/no partial inserts.

Also inspect the change to `vitest.config.ts`.

Determine whether serializing Vitest execution is justified and whether it causes any undesirable project-wide behavioral change.

Do not accept a test merely because it passes; verify that the assertions actually prove the requirement.

### Scope
- Confirm that no T-004+ functionality was implemented.
- Identify any unrelated file changes.
- Verify that README/checklist/prompt-audit changes are appropriate for the current REVIEW state.
- Verify that T-003 has not been prematurely marked completed.

## 3. Re-run verification

You may execute read-only/non-mutating verification commands and disposable test environments as necessary.

At minimum, run or independently verify:

- npm run typecheck
- npm run lint
- npm run build
- npm test
- relevant T-003 integration tests
- git diff --check
- git status --short

If live database verification is needed, use only the repository's established disposable test workflow.

Do not modify persistent project data.

## 4. Review outcome

Classify every finding as:

- BLOCKER
- MAJOR
- MINOR
- NOTE

For each BLOCKER, MAJOR, or MINOR finding provide:

1. Severity
2. File and relevant line(s)
3. What is wrong
4. Which T-003 requirement/risk it affects
5. Why it matters
6. Recommended correction

Do NOT apply the correction.

If there are no actionable findings, explicitly state:

`No BLOCKER, MAJOR, or MINOR findings.`

## 5. SRG01 decision

At the end, provide one of these exact decisions:

`SRG01: PASS`

or

`SRG01: FAIL`

PASS only if there are no BLOCKER, MAJOR, or MINOR findings that should be corrected before T-003 closure.

A NOTE alone does not fail SRG01.

## 6. Final report

Report:

1. Files/documentation reviewed.
2. Verification commands executed and results.
3. Findings ordered by severity.
4. Test coverage assessment.
5. Database/transaction/idempotency assessment.
6. Scope assessment.
7. `SRG01: PASS` or `SRG01: FAIL`.
8. Whether a corrective implementation prompt is required.
9. Current `git status --short`.

Do not perform Final Gate.
Do not close T-003.
Do not modify the prompt audit during this review.
Stop after reporting the Senior Review result.
```

### Prompt #3 — T-003 Final Gate and Closure

```text
You are performing the Final Gate and closure for T-003 — Product Seed in the `iconext-test-be` repository.

T-003 implementation has already completed its implementation verification and Senior Review.

The Senior Review result was:

`SRG01: PASS`

with:

`No BLOCKER, MAJOR, or MINOR findings.`

There was one non-blocking NOTE that the implementation treats `deleted_at != null` as a seed conflict, but there is no dedicated soft-delete test. The Senior Review explicitly determined this is not closure-blocking.

This step is the FINAL GATE for T-003.

Do not implement T-004 or later functionality.
Do not perform unrelated refactoring.
Do not create a Git commit.
Do not push anything.

## 1. Re-establish source of truth

Before changing closure/audit documentation, inspect the current repository state and relevant T-003 evidence, including at minimum:

- docs/IMPLEMENTATION_CHECKLIST.md
- docs/prompts/T-003-product-seed.md
- README.md
- package.json
- relevant requirement/architecture documentation
- T-002 migration/schema implementation
- src/database/seeds/202609170001_seed_products.ts
- tests/integration/product-seed.test.ts
- vitest.config.ts
- current git diff
- current git status

Confirm that the implementation still matches the documented T-003 requirements.

## 2. Verify Senior Review evidence

Confirm that the Senior Review result is consistent with the current working tree:

- SRG01 was PASS.
- There are no unresolved BLOCKER findings.
- There are no unresolved MAJOR findings.
- There are no unresolved MINOR findings requiring correction.
- The soft-delete-test observation is NOTE-only and does not contradict a documented T-003 acceptance criterion.
- No corrective implementation prompt is required.

If the current repository state differs materially from the state that passed Senior Review, STOP and report Final Gate failure.

Do not close T-003 in that situation.

## 3. Final verification

Run the final required checks against the current working tree.

At minimum:

- npm run typecheck
- npm run lint
- npm run build
- npm test
- relevant T-003 integration verification
- git diff --check
- git diff --cached --check
- git status --short

Use the established disposable MySQL/Docker workflow if necessary to confirm live database behavior.

Confirm:

- exactly P001–P005 canonical products,
- documented canonical field values,
- positive integer THB prices,
- documented relative image paths,
- first-run insertion,
- repeated execution is idempotent,
- matching existing rows and IDs remain unchanged,
- missing canonical rows can be inserted,
- conflicting canonical rows are rejected without overwrite,
- conflict failure leaves no partial seed state,
- transaction behavior is correct,
- T-002 constraints remain respected,
- no T-004+ functionality exists.

Do not weaken or remove tests.

## 4. Prompt audit completion

Inspect:

`docs/prompts/T-003-product-seed.md`

The T-003 prompt audit must preserve every prompt actually used for T-003 verbatim.

It must include, in chronological order:

1. Prompt #1 — T-003 Product Seed implementation prompt.
2. Prompt #2 — T-003 Senior Review prompt.
3. This Prompt #3 — T-003 Final Gate + Closure prompt.

Append any missing Prompt #2 and Prompt #3 text verbatim.

Do not rewrite, summarize, normalize, or silently correct the prompt text.

Do not add prompts that were never actually used.

Do not include secrets, credentials, tokens, or environment-sensitive values.

## 5. Closure decision

Only if ALL of the following are true:

- documented T-003 acceptance criteria are satisfied,
- implementation verification passes,
- final verification passes,
- SRG01 is PASS,
- no closure-blocking findings remain,
- prompt audit is complete,
- no out-of-scope T-004+ implementation exists,

then update the repository's task/checklist documentation to mark T-003 completed using the exact status/format/convention already established by completed T-001 and T-002.

Update any T-003-specific documentation that must change as part of the established closure convention.

Do not invent a new status convention.

Do not alter T-004 or later task status.

If ANY gate fails:

- do not mark T-003 completed,
- leave it in its current non-completed state,
- report exactly which gate failed and why.

## 6. Final repository integrity check

After any allowed audit/closure documentation updates:

- inspect the final git diff,
- run `git diff --check`,
- run `git diff --cached --check`,
- run `git status --short`.

Confirm there are no accidental or unrelated changes.

Do not stage files.
Do not commit.
Do not push.

## 7. Final Gate result

Finish with exactly one of:

`FINAL GATE: PASS — T-003 CLOSED`

or

`FINAL GATE: FAIL — T-003 NOT CLOSED`

A PASS is allowed only when T-003 has actually been updated to the repository's completed state and all gates above pass.

## 8. Final report

Report:

1. Source-of-truth files inspected.
2. Senior Review/SRG01 evidence confirmed.
3. Final verification commands and results.
4. T-003 acceptance-criteria verification.
5. Prompt-audit verification, including confirmation that Prompts #1, #2, and #3 are preserved verbatim.
6. Closure documentation/files changed.
7. Confirmation that T-004+ status/functionality was untouched.
8. Final `git diff --check` result.
9. Final `git diff --cached --check` result.
10. Final `git status --short`.
11. Final Gate result.

Do not commit or push.

Stop after the Final Gate report.
```

## Codex implementation summary

- Added the canonical P001–P005 Knex seed with transactional idempotency and conflict rejection.
- Added disposable-live-MySQL integration coverage for the exact dataset, reruns, partial matching state, and conflicting state.
- Updated seed documentation and the T-003 checklist.
- Senior Review completed with `SRG01: PASS` and no BLOCKER, MAJOR, or MINOR findings.
- Final Gate completed and T-003 closed as `DONE`.

## Files created / modified

- `src/database/seeds/202609170001_seed_products.ts`
- `tests/integration/product-seed.test.ts`
- `vitest.config.ts`
- `README.md`
- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/T-003-product-seed.md`

## Tests executed

- Added T-003 integration tests gated by `NODE_ENV=test` and `DB_TEST_CONTEXT=disposable`.
- Ran `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test` locally.
- Ran the full suite against disposable live MySQL.
- Ran the backend seed command twice, queried persisted data after each run, and exercised an intentional P003 conflict.
- Final Gate re-ran `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, T-003 test selection, disposable live MySQL suite, seed runner verification, `git diff --check`, and `git diff --cached --check`.

## Test results

- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- Local automated suite passes 21 tests with 13 safely skipped live-database tests.
- Disposable live MySQL suite passes all 34 tests.
- The backend seed runner creates exactly P001–P005, is unchanged on a second run, and rejects an intentional P003 conflict without overwriting data.
- Final Gate verification passed; T-003 acceptance criteria remain satisfied.

## Senior Review findings

- SRG01: PASS
- No BLOCKER, MAJOR, or MINOR findings.
- NOTE: implementation treats `deleted_at != null` as a seed conflict, but there is no dedicated soft-delete test; Senior Review determined this is not closure-blocking.

## Fixes made after review

None required.

## Final Task status

DONE
