# T-002 — MySQL Schema + Migration

## Task ID and title

T-002 — MySQL Schema + Migration

## Objective

สร้าง MySQL 8.x schema/migrations และ containerized database environment ที่บังคับ data integrity ตาม requirements

## Requirement references

Q026, Q040–Q047, Q049–Q053, Q080–Q085, Q109–Q112, Q139–Q141, Q147–Q148; RC04; RU01; RU07–RU08; AD01; TECH01; ES03–ES04; SRG01; AUD01

## Exact user prompt sent to Codex

Recorded at: 2026-09-17 00:39:06 +07:00

Purpose: Initial T-002 implementation.

### Prompt #1 — Initial T-002 Implementation

````text
# T-002 — Database Schema

You are implementing **T-002: Database Schema** for this project.

## Mandatory first step — read the source of truth

Before changing any code, inspect the repository and read all relevant project documentation, especially:

* `AGENTS.md`
* the implementation checklist / task tracking document
* requirement/specification documents
* architecture/design decisions
* existing database configuration and migrations
* Docker / Docker Compose configuration
* T-001 implementation and its established project conventions
* any document containing acceptance criteria such as `C01–C04` and `U01–U08`

Repository documentation is the **source of truth**.

Do not invent requirements that are not supported by the repository documentation.

If this prompt conflicts with an explicit repository requirement, stop and report the conflict before implementing.

---

# Objective

Implement the database schema required by **T-002** according to the approved requirements and engineering decisions.

The expected domain includes, where confirmed by the repository documentation:

* `products`
* `sales`
* `payments`
* `idempotency_keys`

Implement the required:

* tables
* columns
* data types
* primary keys
* foreign keys
* unique constraints
* indexes
* nullable / non-nullable constraints
* default values
* relationships
* migrations

Do not add tables, columns, constraints, indexes, or behavior unless they are required by the specification or clearly necessary to satisfy an approved requirement.

---

# Database integrity

Pay particular attention to database-level integrity.

Verify that the schema correctly enforces the documented relationships and uniqueness rules.

Do not rely only on application code when a constraint is explicitly required at database level.

Foreign-key behavior such as:

* `ON DELETE`
* `ON UPDATE`

must follow the documented design.

Do not assume `CASCADE`, `RESTRICT`, `SET NULL`, or any other behavior unless supported by the specification.

---

# Idempotency

Implement the database structure required for the project's idempotency behavior.

The `idempotency_keys` design must follow the approved specification, including any documented:

* uniqueness rules
* request identity/scope
* stored response/result
* status
* timestamps
* expiration/retention behavior

Do not design a new idempotency strategy if the repository already defines one.

---

# Migration requirements

Use the migration mechanism already established by the project.

The migration must:

1. work on a clean database;
2. be deterministic;
3. create the required schema successfully;
4. preserve referential integrity;
5. follow the project's naming conventions;
6. avoid destructive operations unrelated to T-002.

Do not manually modify a running database as a substitute for a migration.

---

# Docker verification

Use the Docker environment established in T-001.

Verify that a fresh environment can initialize the database and apply the T-002 migration successfully.

At minimum verify the equivalent project workflow for:

1. clean/start database;
2. run migrations;
3. confirm migration completes successfully;
4. confirm required tables exist;
5. confirm required constraints/indexes exist.

Use the actual commands defined by this repository rather than inventing alternative project commands.

---

# Acceptance criteria

Trace the implementation against all applicable acceptance criteria, including:

* `C01–C04`
* `U01–U08`

Only criteria relevant to T-002 need to be satisfied by this task, but explicitly identify which criteria T-002 covers.

Do not claim an acceptance criterion passes without evidence.

---

# Tests / verification

Perform appropriate verification for the schema.

At minimum check:

* migration succeeds on a clean database;
* required tables exist;
* expected columns and data types are correct;
* PK constraints work;
* FK constraints work;
* unique constraints work;
* required indexes exist;
* invalid relational data is rejected where appropriate;
* valid relational data can be inserted;
* migration/database startup works through the project's Docker setup.

If automated database/migration tests already exist, extend them rather than creating a competing testing approach.

Run existing lint/test/build/type-check commands where applicable.

---

# Scope control

T-002 is a **database schema task**.

Do NOT implement future tasks unless a minimal change is strictly required for T-002.

Specifically avoid unnecessary implementation of:

* API endpoints
* controllers
* business services
* frontend/UI
* unrelated refactoring
* future task functionality

If you discover something that belongs to another task, document it instead of implementing it.

---

# Prompt audit requirement

This exact prompt must be preserved **verbatim** in the project's designated T-002 prompt/audit location according to the convention established by T-001.

Do not summarize, rewrite, clean up, or paraphrase it.

If T-001 established a naming/path convention for task prompts, follow that convention exactly.

---

# Before modifying files

First report:

1. documents/files inspected;
2. exact T-002 requirements you found;
3. applicable acceptance criteria;
4. database/migration technology currently used;
5. files you expect to modify/create;
6. any ambiguity or conflict found.

If there is a material ambiguity that could change the schema design, **stop before implementation and report it**.

Otherwise proceed with implementation.

---

# After implementation

Provide a final report containing:

## Files changed

List every created/modified file and why.

## Schema implemented

Summarize tables, relationships, constraints and indexes actually implemented.

## Verification

List commands/tests executed and their results.

## Acceptance criteria

Map applicable acceptance criteria to concrete implementation/test evidence.

## Scope check

Confirm whether any changes outside T-002 were necessary.

## Findings

Report warnings, assumptions, unresolved questions, or follow-up items.

## Git status

Show the final repository status/diff summary.

Do **not** mark T-002 as CLOSED/DONE yourself.

T-002 may only be closed after implementation, testing, review, prompt audit and final gate have been independently verified.
````

## Additional / follow-up prompts

Recorded at: 2026-09-17 01:29:42 +07:00

Purpose: Fix the three actionable findings from the independent SRG01 review and re-run T-002 verification.

### Prompt #2 — Fix SRG01 Findings

````text
# T-002 — Fix SRG01 Findings

T-002 is currently in REVIEW.

An independent SRG01 review returned:

Review verdict: CHANGES REQUIRED

Actionable findings:

- SRG01-T002-001 — MAJOR
- SRG01-T002-002 — MAJOR
- SRG01-T002-003 — MINOR

Your task is to fix ONLY these actionable T-002 findings and then
re-run the required verification.

Do NOT implement T-003 or later-task functionality.
Do NOT mark T-002 as DONE.
Do NOT commit.
Keep T-002 in REVIEW.

Before modifying files, re-read the relevant source-of-truth documents,
especially:

- AGENTS.md
- implementation checklist
- approved API contract
- engineering decisions
- T-002 prompt/audit
- current migration
- database integration tests

Repository documentation remains the source of truth.

--------------------------------------------------
1. Fix SRG01-T002-001 — MAJOR
--------------------------------------------------

Problem:

The approved API contract defines:

payment_method = CASH | QR_PAYMENT

but the current database migration/schema/tests use:

CASH | OR

Correct the T-002 database implementation so the database domain matches
the approved API contract exactly.

At minimum inspect and correct all T-002 occurrences affecting:

- payments.payment_method enum/domain
- chk_payments_change_by_method
- database schema tests
- related T-002 database documentation if it currently records the
  incorrect value as implementation evidence

Use QR_PAYMENT consistently where required.

Do NOT modify the approved API contract merely to match the implementation.

After the fix, prove through live MySQL verification that QR_PAYMENT can
be persisted when otherwise valid and that invalid payment-method values
are rejected.

--------------------------------------------------
2. Fix SRG01-T002-002 — MAJOR
--------------------------------------------------

Problem:

The database integration tests can execute when ordinary database
environment variables are present and may delete pre-existing development
records using fixed business identifiers such as P999.

Make live database tests safe and isolated.

Requirements:

- Tests must not silently operate against an ordinary development,
  staging, production, or otherwise non-disposable database.
- Require an explicit test/disposable database context before destructive
  integration-test DML is allowed.
- Fail safely or skip according to the project's established test strategy
  when the required test database context is not present.
- Do not rely only on the presence of ordinary DB environment variables.
- Avoid deleting pre-existing business data using predictable fixed
  identifiers.
- Use collision-resistant test fixtures and/or appropriate isolation.
- Cleanup must only remove data created by the test execution.
- Preserve the documented host behavior where live database tests may be
  skipped when no explicit live-test environment exists.
- Preserve mandatory live MySQL/container verification.

Use the smallest maintainable change consistent with the existing project
architecture.

Do not redesign unrelated test infrastructure.

Add or adjust tests/evidence proving the safety gate works.

--------------------------------------------------
3. Fix SRG01-T002-003 — MINOR
--------------------------------------------------

Problem:

The conditional-change negative test is not regression-specific.

The existing invalid QR payment case uses a Sale that already has a
payment, meaning payments.sale_id uniqueness could reject the insert even
if chk_payments_change_by_method were broken.

Correct the test so it proves the intended CHECK constraint.

Use:

- a valid Sale with no existing Payment;
- an otherwise valid QR_PAYMENT;
- an invalid change value for QR_PAYMENT;
- an assertion that verifies the CHECK constraint failure specifically.

Where practical, assert the MySQL CHECK-constraint error and/or named
constraint:

chk_payments_change_by_method

The test must fail if that CHECK predicate is removed or regressed.

--------------------------------------------------
4. Regression verification
--------------------------------------------------

After implementing the fixes, run the project's applicable verification.

At minimum:

- npm run typecheck
- npm run lint
- npm run build
- npm test

Then perform the documented clean/live MySQL container verification.

Verify:

- clean migration succeeds;
- all four T-002 tables exist;
- corrected QR_PAYMENT schema behavior works;
- payment conditional-change CHECK works;
- FK/unique/check constraints still work;
- integration suite passes;
- complete live-MySQL suite passes;
- container recreation/schema persistence still works if this is part of
  the established T-002 verification;
- test isolation/safety behavior is proven.

Do not weaken assertions merely to obtain passing tests.

--------------------------------------------------
5. Re-check SRG01 findings
--------------------------------------------------

Explicitly map evidence back to:

SRG01-T002-001
SRG01-T002-002
SRG01-T002-003

For each finding report:

FIXED
or
NOT FIXED

with concrete evidence.

--------------------------------------------------
6. Documentation and audit
--------------------------------------------------

Update only T-002 documentation/evidence that must reflect the fixes.

Preserve the original T-002 implementation prompt verbatim.

Do not rewrite or replace the original prompt.

Update the T-002 audit/result section with:

- SRG01 review result
- findings
- corrections made
- verification evidence

Keep T-002 status as REVIEW.

--------------------------------------------------
7. Git verification
--------------------------------------------------

Inspect:

git status
git diff --stat
git diff --check

Also inspect the relevant full diff.

Do not stage/unstage files merely for presentation.
Do not commit.

Report whether any changed file falls outside T-002 scope.

--------------------------------------------------
8. Final report
--------------------------------------------------

Return:

# T-002 SRG01 Fix Report

## Findings status

SRG01-T002-001: FIXED / NOT FIXED
SRG01-T002-002: FIXED / NOT FIXED
SRG01-T002-003: FIXED / NOT FIXED

## Files changed

List each file and why.

## Fix evidence

Provide concrete evidence for each finding.

## Verification

List exact commands and results.

## Acceptance criteria impact

Report whether the fixes changed T-002 coverage of C01-C04 or U01-U08.

## Scope check

Confirm no T-003 or later functionality was implemented.

## Git status

Report final working-tree/index status and diff-check result.

## Remaining findings

List anything still unresolved.

Do NOT mark T-002 DONE.
Do NOT perform Final Gate.
Do NOT create a commit.

Stop after the fix report.
````

Recorded at: 2026-09-17 01:57:07 +07:00

Purpose: Record the already-completed independent SRG01 re-review evidence without changing T-002 implementation or status.

### Prompt #3 — Record Completed SRG01 Re-review Evidence

````text
# T-002 — Record Completed SRG01 Re-review Evidence

T-002 Final Gate failed solely because the T-002 audit trail has not yet
recorded the already-completed independent SRG01 re-review.

Do NOT change implementation code.
Do NOT change migration code.
Do NOT change tests.
Do NOT implement any new functionality.
Do NOT perform another SRG01 review.
Do NOT mark T-002 DONE.
Do NOT commit.

Update only the appropriate T-002 audit/checklist documentation necessary
to accurately record the SRG01 re-review that has already been completed.

The completed independent SRG01 re-review result was:

- Re-review verdict: PASS

Previous findings:

- SRG01-T002-001: VERIFIED FIXED
- SRG01-T002-002: VERIFIED FIXED
- SRG01-T002-003: VERIFIED FIXED

New findings:

- BLOCKER: 0
- MAJOR: 0
- MINOR: 0
- NOTE: 0

Verification recorded by the re-review:

- npm run typecheck — PASS
- npm run lint — PASS
- npm run build — PASS
- npm test — PASS: 21 passed, 9 safely skipped
- Disposable live MySQL suite — PASS: 30/30
- clean migration — PASS
- QR\_PAYMENT behavior — PASS
- test safety/isolation — PASS
- repeated migration — PASS
- container/schema persistence — PASS
- git diff --check — PASS
- git diff --cached --check — PASS

Prompt audit status from re-review: PASS
Scope status from re-review: PASS

Final recommendation from the completed re-review:

READY FOR FINAL GATE

Update the audit so it no longer incorrectly states that independent
re-review is outstanding.

Preserve all existing verbatim prompts exactly.
Do not rewrite or alter Prompt #1 or Prompt #2.

Maintain T-002 status as REVIEW.

After the documentation update run:

git diff --check
git diff --cached --check
git status

Confirm that no implementation/test/migration file was changed by this
operation.

Return:

# T-002 Re-review Audit Update

## Audit update

PASS / FAIL

## Re-review evidence

Summarize exactly what completed evidence was recorded.

## Files changed

List files changed by this operation.

## Prompt preservation

PASS / FAIL

## T-002 status

Must remain REVIEW.

## Git verification

Report git status, git diff --check and git diff --cached --check.

## Next action

If successful:
READY TO RE-RUN FINAL GATE

Do NOT commit.
````


Recorded at: 2026-09-17 02:01:46 +07:00

Purpose: Re-run the T-002 Final Gate after correcting the missing independent re-review audit evidence.

### Prompt #4 — Final Gate Re-run After Audit Correction

````text
# T-002 — Final Gate Re-run After Audit Correction

Re-run the T-002 Final Gate after correcting the previously missing
SRG01 re-review audit evidence.

The previous Final Gate failed for ONE reason only:

- The completed independent SRG01 re-review had not yet been recorded
  in the T-002 audit trail.

That audit issue has now been corrected.

Current state:

- T-002 status: REVIEW
- Implementation verification previously passed.
- SRG01-T002-001: VERIFIED FIXED
- SRG01-T002-002: VERIFIED FIXED
- SRG01-T002-003: VERIFIED FIXED
- Independent SRG01 re-review: PASS
- New re-review findings:
  - BLOCKER: 0
  - MAJOR: 0
  - MINOR: 0
  - NOTE: 0
- Re-review recommendation: READY FOR FINAL GATE
- Re-review evidence is now recorded in the T-002 audit.
- Prompt preservation check: PASS
- Scope check: PASS
- Repository hygiene from the previous Final Gate: PASS

IMPORTANT:

This is a targeted Final Gate re-run.

Do NOT modify implementation code.
Do NOT modify migrations.
Do NOT modify tests.
Do NOT implement T-003 or later functionality.
Do NOT create a commit.
Do NOT push.

--------------------------------------------------
1. Verify the corrected audit prerequisite
--------------------------------------------------

Inspect:

- docs/prompts/T-002-database-schema.md
- docs/IMPLEMENTATION_CHECKLIST.md
- relevant T-002 source-of-truth documents

Confirm that the completed independent SRG01 re-review is now accurately
recorded.

Verify that the audit contains:

- re-review verdict: PASS
- SRG01-T002-001: VERIFIED FIXED
- SRG01-T002-002: VERIFIED FIXED
- SRG01-T002-003: VERIFIED FIXED
- new findings: BLOCKER 0, MAJOR 0, MINOR 0, NOTE 0
- verification evidence
- prompt audit PASS
- scope PASS
- READY FOR FINAL GATE recommendation

Confirm the audit no longer incorrectly states that independent re-review
is outstanding.

--------------------------------------------------
2. Verify prompt preservation
--------------------------------------------------

Confirm that all prompts required by the established audit convention are
preserved correctly.

In particular:

- Prompt #1 remains verbatim.
- Prompt #2 remains verbatim.
- Prompt #3 is recorded according to AUD01.
- No earlier prompt was rewritten as part of the audit correction.

If prompt preservation fails, Final Gate fails.

--------------------------------------------------
3. Confirm previous Final Gate evidence remains valid
--------------------------------------------------

Review the previous Final Gate result and current repository diff.

Confirm no implementation, migration, test, configuration, or package
file changed after the previous Final Gate verification.

If only audit/checklist documentation changed, the previous successful
implementation verification may be reused.

Previous successful verification included:

- npm run typecheck — PASS
- npm run lint — PASS
- npm run build — PASS
- npm test — PASS
- clean migration — PASS
- disposable live MySQL suite — PASS 30/30
- all four required tables present
- CASH / QR_PAYMENT domain verified
- invalid payment method rejected
- conditional-change constraint verified
- database safety gate verified
- test isolation verified
- repeated migration verified
- container/schema persistence verified
- SRG01 findings remained fixed

If implementation/test-related files changed since that verification,
do NOT reuse the evidence.

In that case, re-run the affected verification before making the Final
Gate decision.

--------------------------------------------------
4. Acceptance criteria and scope sanity check
--------------------------------------------------

Confirm the accepted T-002 classification remains:

- C01-C04: partial T-002 schema foundations
- U01-U02: partial schema support
- U03-U04: deferred to later HTTP/API tasks
- U05-U06: deferred to T-003
- U07: supported
- U08: supported

Confirm no T-002-owned requirement remains unresolved.

Confirm no T-003 or later functionality was introduced.

--------------------------------------------------
5. Repository hygiene
--------------------------------------------------

Inspect:

git status
git diff --stat
git diff --check
git diff --cached --stat
git diff --cached --check

Inspect staged and unstaged diffs.

Confirm:

- only expected T-002 files exist;
- audit correction introduced only expected documentation changes;
- no conflict markers;
- no debugging artifacts;
- no temporary files;
- no tracked secrets;
- no unrelated changes.

--------------------------------------------------
6. Final Gate decision
--------------------------------------------------

Return exactly ONE:

FINAL GATE: PASS

or

FINAL GATE: FAIL

Final Gate may PASS only if:

- corrected re-review audit evidence is complete;
- prompt preservation passes;
- previous implementation verification remains valid;
- all SRG01 findings remain resolved;
- no actionable finding remains;
- scope passes;
- repository hygiene passes;
- no T-002-owned requirement remains unresolved.

--------------------------------------------------
7. Closure — ONLY IF PASS
--------------------------------------------------

ONLY IF:

FINAL GATE: PASS

perform the documentation-only T-002 closure.

Update the established checklist/task status:

T-002: REVIEW → DONE

Update the T-002 audit with:

- Final Gate re-run result: PASS
- closure evidence
- final T-002 status: DONE

Preserve all verbatim prompts.

Do NOT modify implementation, migration, or tests.

After closure run:

git status
git diff --check
git diff --cached --check

If closure introduces an error, report it and do not claim successful
closure.

--------------------------------------------------
8. Commit policy
--------------------------------------------------

DO NOT COMMIT.
DO NOT PUSH.

Leave all intended T-002 changes ready for human authorization.

--------------------------------------------------
9. Final report
--------------------------------------------------

Return:

# T-002 Final Gate Re-run Report

## Final Gate decision

FINAL GATE: PASS / FAIL

## Audit prerequisite

PASS / FAIL

## Prompt preservation

PASS / FAIL

## Previous verification validity

VALID / INVALID

Explain whether implementation verification had to be re-run.

## SRG01 closure

SRG01-T002-001:
VERIFIED FIXED / REGRESSED

SRG01-T002-002:
VERIFIED FIXED / REGRESSED

SRG01-T002-003:
VERIFIED FIXED / REGRESSED

## Acceptance criteria

Report final C01-C04 and U01-U08 classification.

## Scope

PASS / FAIL

## Repository hygiene

PASS / FAIL

## T-002 status

DONE / REVIEW

## Closure changes

List documentation files changed during closure.

## Git verification

Report:
- branch
- staged files
- unstaged files
- untracked files
- git diff --check
- git diff --cached --check

## Commit status

NO COMMIT CREATED

## Next action

If PASS:

READY FOR HUMAN COMMIT AUTHORIZATION

If FAIL:

FIXES REQUIRED BEFORE T-002 CLOSURE
````

## Codex implementation summary

Implemented the initial MySQL 8.x schema through the established Knex migration mechanism, then corrected all three actionable findings from the independent SRG01 review. The Payment domain now matches the approved `CASH | QR_PAYMENT` API contract. Live schema tests require an explicit disposable test context and run all fixture DML inside rollback-only transactions, eliminating fixed-identifier cleanup against pre-existing data. The QR conditional-change regression test now uses an unpaid Sale and verifies the exact MySQL check error and named constraint.

SRG01 fix verification completed at: 2026-09-17 01:29:42 +07:00.

## Files created / modified

- `src/database/migrations/202609170001_create_initial_schema.ts` — deterministic initial schema migration and reverse-order rollback
- `tests/integration/database-schema.test.ts` — explicit disposable-context gate, per-test transaction isolation, corrected Payment domain coverage, and regression-specific named-check assertion
- `tests/support/database-test-context.ts` — smallest shared predicate requiring `NODE_ENV=test` and `DB_TEST_CONTEXT=disposable`
- `tests/unit/database-test-context.test.ts` — positive and negative safety-gate coverage
- `README.md` — explicit disposable live-test workflow and safety behavior
- `docs/IMPLEMENTATION_CHECKLIST.md` — SRG01 finding status, verification evidence, unchanged acceptance coverage, and `REVIEW` status
- `docs/prompts/T-002-database-schema.md` — unchanged verbatim Prompt #1, verbatim Prompt #2, review findings, fixes, and evidence

## Tests executed

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`
- `docker compose -p t002-srg-fix --env-file .env.example up -d mysql`
- `docker compose -p t002-srg-fix --env-file .env.example run --build --rm -e NODE_ENV=test backend npm run db:migrate` on a clean named volume
- the same migration command a second time after inserting a sentinel row
- live metadata queries for tables, `payments.payment_method`, `chk_payments_change_by_method`, migration history, sentinel survival, and rolled-back fixture counts
- `docker compose -p t002-srg-fix --env-file .env.example run --rm -e NODE_ENV=test -e DB_TEST_CONTEXT=disposable backend npm test`
- `docker compose -p t002-srg-fix --env-file .env.example run --rm -e NODE_ENV=test backend npm test -- tests/integration/database-schema.test.ts` without the disposable flag
- deliberate isolated mutation of `chk_payments_change_by_method` to `CHECK (1 = 1)`, followed by the database integration test as an expected-failure regression proof
- `docker compose -p t002-srg-persistence --env-file .env.example up --force-recreate -d mysql`, followed by migration and metadata/data queries with the named volume retained
- `docker compose -p t002-srg-fix --env-file .env.example down -v`; only the isolated verification project and its temporary volume were removed
- `docker compose -p t002-srg-persistence --env-file .env.example down -v`; only the isolated persistence project and its temporary volume were removed

## Test results

- TypeScript typecheck, ESLint, and production build: PASS
- Host suite: PASS; 21 tests passed and all 9 live database tests skipped without an explicit disposable context
- Clean MySQL 8.4 migration: PASS; all four T-002 tables existed, `payment_method` was `enum('CASH','QR_PAYMENT')`, and the named change check contained `QR_PAYMENT`
- Repeated migration/persistence: PASS; the existing `P997` sentinel survived and the migration remained a single batch-1 record
- Container recreation/persistence: PASS; after recreating only the isolated MySQL container, the named volume retained the `P996` sentinel, batch-1 migration record, corrected `QR_PAYMENT` enum, and `chk_payments_change_by_method`
- Complete live-MySQL suite: PASS; 30/30 tests across 5 files, including all 9 T-002 schema tests
- Payment behavior: PASS; a valid `QR_PAYMENT` with `change = NULL` persisted inside the test transaction and unsupported `CARD` was rejected
- Unique, FK, and other named check constraints: PASS in the complete live suite
- Safety gate: PASS; with complete ordinary DB variables and `NODE_ENV=test` but no `DB_TEST_CONTEXT`, all 9 schema tests skipped
- Isolation: PASS; the pre-existing `P997` sentinel survived, `P999` was absent afterward, and Sales, Payments, and Idempotency fixture counts were zero after the suite
- Regression falsification: PASS; weakening only `chk_payments_change_by_method` caused the intended assertion to fail (1 failed, 8 passed), proving it no longer passes via Payment Sale uniqueness

## Senior Review findings

Independent SRG01 review verdict: `CHANGES REQUIRED`.

- `SRG01-T002-001` — MAJOR: Payment enum/check/tests used `QR` instead of the approved `QR_PAYMENT`
- `SRG01-T002-002` — MAJOR: ordinary DB variables could enable destructive fixed-identifier cleanup against pre-existing records
- `SRG01-T002-003` — MINOR: invalid QR change could be rejected by Payment Sale uniqueness rather than the intended named check

## Fixes made after review

- `SRG01-T002-001` — FIXED: migration enum and named change check use `QR_PAYMENT`; metadata and live behavior tests verify the approved value and reject unsupported methods
- `SRG01-T002-002` — FIXED: explicit disposable-context gate, gate unit tests, documented opt-in command, transaction rollback, and removal of delete-by-fixed-identifier cleanup
- `SRG01-T002-003` — FIXED: the negative case creates a separate valid unpaid Sale, attempts otherwise-valid `QR_PAYMENT` with invalid non-null change, and checks both `ER_CHECK_CONSTRAINT_VIOLATED` and `chk_payments_change_by_method`

These corrections do not change T-002 acceptance coverage: C01–C04/U01–U02 remain partial schema foundations, U03–U06 remain deferred to their owning later tasks, and U07–U08 remain supported.

## Independent SRG01 re-review

Re-review verdict: `PASS`.

Previous findings verification:

- `SRG01-T002-001` — `VERIFIED FIXED`
- `SRG01-T002-002` — `VERIFIED FIXED`
- `SRG01-T002-003` — `VERIFIED FIXED`

New findings:

- BLOCKER: 0
- MAJOR: 0
- MINOR: 0
- NOTE: 0

Independent verification evidence:

- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm run build` — PASS
- `npm test` — PASS; 21 tests passed and 9 live database tests safely skipped
- Disposable live MySQL suite — PASS; 30/30 tests passed
- Clean migration and all four required T-002 tables — PASS
- `QR_PAYMENT` behavior and unsupported-method rejection — PASS
- Explicit disposable-context safety gate, sentinel preservation, and rollback isolation — PASS
- Repeated migration and named-volume/container schema persistence — PASS
- `git diff --check` and `git diff --cached --check` — PASS
- Prompt audit status — PASS
- Scope status — PASS; no T-003 or later-task functionality was introduced

Final re-review recommendation: `READY FOR FINAL GATE`.

## Final Gate re-run and closure

Final Gate re-run completed at: 2026-09-17 02:01:46 +07:00.

Final Gate decision: `PASS`.

Closure evidence:

- Corrected audit prerequisite — PASS; completed independent SRG01 re-review evidence is present
- Prompt preservation — PASS; Prompt #1 and Prompt #2 remain verbatim, and Prompt #3 and Prompt #4 follow AUD01
- Previous implementation verification — VALID; only T-002 audit/checklist documentation changed after the full Final Gate verification
- `SRG01-T002-001` — `VERIFIED FIXED`
- `SRG01-T002-002` — `VERIFIED FIXED`
- `SRG01-T002-003` — `VERIFIED FIXED`
- Acceptance ownership — PASS; C01–C04/U01–U02 remain partial schema foundations, U03–U06 remain deferred to their owning tasks, and U07–U08 are supported
- Scope — PASS; no T-003 or later-task functionality was introduced
- Repository hygiene — PASS; no unexpected files, conflict markers, debugging artifacts, tracked secrets, or unrelated changes
- `git diff --check` and `git diff --cached --check` — PASS before closure
- Commit policy — no commit or push performed

T-002 closure: status changed from `REVIEW` to `DONE` after Final Gate re-run passed.

## Git verification

- `git diff --check` and `git diff --cached --check`: PASS; only line-ending conversion warnings were reported
- The relevant staged, unstaged, and untracked T-002 diffs were inspected; no changed file falls outside T-002 scope
- Existing index state was preserved; no file was staged or unstaged, and no commit was created

## Final Task status

DONE — implementation verification passed, all three SRG01 findings are verified fixed, independent SRG01 re-review passed with no new findings, the corrected audit prerequisite passed, and Final Gate re-run passed.
