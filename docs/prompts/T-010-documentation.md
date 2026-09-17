# T-010 — README + API Documentation

## Task ID and title

T-010 — README + API Documentation

## Objective

จัดทำเอกสารที่ตรง implementationจริงและทำให้ reviewer setup/run/migrate/seed/test/review ระบบได้

## Requirement references

Q079–Q082, Q101–Q104, Q119, Q122–Q132, Q145–Q149; RC01–RC04; RU01–RU08; AD01; TECH01–TECH04; ES01–ES11; SRG01; AUD01

## Exact user prompt sent to Codex

### Prompt #1 — 2026-09-17

> Implement **T-010** for this backend repository.
>
> Before making any changes:
>
> 1. Read `docs/IMPLEMENTATION_CHECKLIST.md`.
> 2. Locate **T-010** and treat its requirements, acceptance criteria, dependencies, and notes as the source of truth.
> 3. Review the existing implementation from **T-001 through T-009** and preserve the current architecture, conventions, API behavior, and project structure.
> 4. Do not modify unrelated functionality.
>
> Implementation requirements:
>
> - Implement everything required by **T-010** according to `docs/IMPLEMENTATION_CHECKLIST.md`.
> - Follow the existing backend architecture and coding conventions.
> - Write production-quality code at a **Senior Backend Developer** standard.
> - Keep responsibilities properly separated between routes/controllers, services, repositories/data-access, models/types, middleware, utilities, or other existing layers as applicable.
> - Reuse existing abstractions where appropriate instead of duplicating logic.
> - Maintain backward compatibility unless T-010 explicitly requires otherwise.
> - Handle validation, errors, edge cases, and asynchronous operations appropriately.
> - Do not introduce unnecessary dependencies or unrelated refactoring.
> - Do not implement tasks after T-010.
>
> After implementation:
>
> - Run the relevant existing validation commands, such as build/type-check, lint, and tests where available.
> - Fix failures caused by the T-010 changes.
> - Review `git diff` and confirm that changes are limited to the scope of T-010.
> - Update the **T-010 evidence/progress section** in `docs/IMPLEMENTATION_CHECKLIST.md` with what was actually implemented and verified.
> - Record commands executed and their results where the checklist expects evidence.
>
> Important:
>
> - **Do not mark T-010 as closed/completed yet.**
> - **Do not commit or push.**
> - Stop after implementation and validation so the changes can be reviewed in the next step.
>
> At the end, report:
>
> 1. What was implemented.
> 2. Files changed.
> 3. Validation/tests executed and their results.
> 4. Any assumptions, risks, or remaining issues.
> 5. Whether T-010 is ready for Senior Review / Final Gate.

## Additional / follow-up prompts

### Prompt #2 — 2026-09-17

```text
Perform the **Senior Review / Final Gate for T-010**.

Treat `docs/IMPLEMENTATION_CHECKLIST.md` as the source of truth.

Review the current T-010 implementation without expanding its scope.

Tasks:

1. Review all files changed by T-010:
   - `README.md`
   - `docs/API.md`
   - `docs/prompts/T-010-documentation.md`
   - the T-010 section/evidence in `docs/IMPLEMENTATION_CHECKLIST.md`
2. Verify the documentation against the actual repository implementation.\
   Confirm that documented:
   - setup commands
   - Docker workflow
   - migrations
   - seed behavior/data
   - readiness/health behavior
   - persistence behavior
   - lifecycle commands
   - API endpoints
   - request/response examples
   - HTTP statuses
   - error behavior
   - schema guarantees
   - idempotency/expiry behavior
   are accurate and reproducible.
3. Perform the clean-checkout/reproducibility documentation workflow required by T-010 and complete **SRG01** according to `docs/IMPLEMENTATION_CHECKLIST.md`.
4. Run the relevant final validation commands required by the checklist. At minimum verify the existing T-010 validation evidence and rerun anything necessary for the final gate.
5. Inspect:
   - `git diff --check`
   - `git diff --stat`
   - `git status --short`
6. Review the changes from a **Senior Backend Developer / Reviewer** perspective for:
   - correctness
   - documentation accuracy
   - reproducibility
   - consistency with the actual code/API
   - missing or misleading instructions
   - accidental scope expansion

If any issue is found:

- Fix only issues within T-010 scope.
- Rerun affected validation.
- Report exactly what was fixed.

If all acceptance criteria and **SRG01** pass:

- Update the T-010 evidence in `docs/IMPLEMENTATION_CHECKLIST.md` with the final verified results.
- Mark T-010 as ready to close according to the checklist's established status convention.

Important:

- Do not implement T-011 or any later task.
- Do not perform unrelated refactoring.
- Do not commit or push.

At the end report:

1. Senior Review findings.
2. SRG01 result.
3. Final validation results.
4. Files changed during the review, if any.
5. Any remaining risks/issues.
6. Explicitly state whether **T-010 passes Final Gate and is ready to close**.
```

## Codex implementation summary

- Reworked README into a reproducible migration-first clean-checkout Docker
  workflow with prerequisites, local environment setup, exact seed data,
  operations, readiness, persistence, and safe test instructions.
- Added a dedicated API contract covering only the three implemented POST
  actions, their exact schemas/statuses/examples/database effects, lifecycle,
  persisted expiration, idempotency, fixed errors, and schema guarantees.
- Cross-checked documentation against T-001–T-009 production code,
  migrations, seed definitions, and executable tests. No production behavior,
  dependency, route, schema, or test was changed.
- Senior Review independently reproduced setup, API examples, lifecycle,
  persistence, and the disposable full-test workflow from a temporary clean
  repository snapshot. One MINOR operational clarification was fixed before
  the final re-review.

## Files created / modified

- `README.md`
- `docs/API.md`
- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/T-010-documentation.md`

## Tests executed

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`
- `docker compose config --quiet`
- `npm run test:docker`
- Parsed every fenced JSON response example in `docs/API.md` with
  `JSON.parse`
- `git diff --check`, `git status --short`, and scoped `git diff` review
- Senior Review temporary clean-checkout workflow: Compose config/build,
  migration, repeated seed, backend health, live API requests,
  restart/logs/stop/start/down, volume persistence, exact isolated manual test
  workflow, and cleanup
- Senior Review host rerun: `npm run test:unit`, `npm test`,
  `npm run typecheck`, `npm run lint`, and `npm run build`

## Test results

- Typecheck, lint, and build: PASS.
- Host test suite: PASS — 84 passed; 58 database-context tests skipped as
  designed.
- Compose config validation: PASS.
- Isolated Docker/MySQL 8.4 environment gate: PASS — image/config, readiness,
  health, service-name networking, migration, idempotent exact seed, named
  volume persistence, 142/142 tests, and isolated cleanup.
- API JSON examples: PASS — 6/6 parsed.
- `git diff --check`: PASS; only expected Windows line-ending warnings were
  emitted.
- The first sandboxed Docker attempt could not access the Docker config/pipe;
  the approved retry completed successfully. This was an execution-environment
  restriction, not a repository failure.
- Senior Review clean-checkout flow: PASS — fresh image and volume, migration,
  repeated seed, both services healthy, live request/response examples, and
  lifecycle commands all matched the documentation.
- Senior Review live API: PASS — Create `201`/replay `200`, CASH
  `201`/replay `200`, QR `201` without `change`, Cancel `200`, and body
  rejection `400` with the documented Thai error contract.
- Named-volume persistence: PASS — after `docker compose down` and MySQL
  recreation, five Products, three review Sales, and two review Payments
  remained.
- Exact isolated README test workflow: PASS — fresh `iconext-review` project,
  migration, seed, 142/142 tests, and containers/network/volume cleanup.
- Senior Review in-container unit suite: PASS — 55/55. Host final regression:
  PASS — 84 passed and 58 expected guarded skips. Typecheck, lint, build, and
  Compose config: PASS.
- A diagnostic full-suite run after live API requests produced 138/142 because
  the seed tests correctly could not delete Products referenced by the review
  Sales. It was not the documented fresh disposable workflow; the subsequent
  exact fresh workflow passed 142/142.

## Senior Review findings

Independent SRG01 result: `PASS` after fix and re-review.

- `SRG01-T010-001` — **MINOR — VERIFIED FIXED**
  - The README correctly said `docker compose down` preserves the volume, but
    did not explain that a reused MySQL volume also retains its initially
    provisioned credentials. A new `.env` with different passwords can
    therefore fail authentication against stale local state.
  - The manual cleanup sentence also omitted the Compose network and did not
    state that the built image remains.
  - Fixed by documenting credential stability, safe disposable-volume
    recreation, use of an unused disposable project name, and exact cleanup
    scope (containers, network, volume; image retained).

Post-fix review found no unresolved BLOCKER, HIGH, MEDIUM, MAJOR, or MINOR
finding. Documentation accuracy, security, reproducibility, API/schema/state
contracts, idempotency/expiry behavior, and scope control all pass.

## Fixes made after review

- Added only the operational clarifications described in
  `SRG01-T010-001`; no production code, test, dependency, schema, route, or
  business behavior changed.
- Appended Prompt #2 and final review evidence to satisfy AUD01.

## Final Task status

DONE — TC-010.1–TC-010.5, acceptance criteria, independent SRG01,
clean-checkout reproduction, full Docker/MySQL verification, host regression,
documentation audit, and Final Gate all pass.
