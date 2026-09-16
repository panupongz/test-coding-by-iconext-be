# T-007 — Validation + Thai Error Response

## Task ID and title

T-007 — Validation + Thai Error Response

## Objective

บังคับ strict validation และ standardized Thai error contract ที่ปลอดภัยและสม่ำเสมอทุก endpoint

## Requirement references

Q070–Q078, Q087–Q101, Q127–Q136; RC01–RC04; RU02–RU04; TECH02–TECH04; ES01–ES02; ES07–ES10; SRG01; AUD01

## Exact user prompt sent to Codex

### Prompt #1

```text
You are implementing **T-007** in the current repository.

## Source of truth

Before changing any code, read and follow:

- `AGENTS.md`
- `docs/IMPLEMENTATION_CHECKLIST.md`
- all existing project documentation relevant to T-007
- existing implementation and tests from T-001 through T-006

Locate the exact **T-007** entry in `docs/IMPLEMENTATION_CHECKLIST.md` and treat its acceptance criteria as the source of truth.

Do not invent requirements that are not present in the repository.

## Task

Implement **T-007** completely according to the checklist and existing project architecture.

Before implementation:

1. Inspect the existing codebase and determine which files/components/services/modules are affected.
2. Reuse existing patterns and conventions established by T-001 through T-006.
3. Preserve backward compatibility unless T-007 explicitly requires otherwise.
4. Keep the implementation strictly within T-007 scope.
5. Do not implement T-008 or later tasks.

## Engineering quality

Implement this as production-quality code expected from a Senior Developer.

Ensure:

- clear separation of concerns
- appropriate naming
- minimal duplication
- no unnecessary abstractions
- consistent error handling
- appropriate validation
- no hard-coded values where configuration/constants already exist
- no unrelated refactoring
- no unnecessary dependency additions
- no secrets or sensitive values committed

If T-007 involves validation or API errors, keep the response contract consistent across affected endpoints and preserve the expected Thai error messages defined by the project requirements.

## Tests

Add or update tests necessary to prove T-007 works.

Cover at minimum:

- expected success behavior
- relevant invalid-input behavior
- relevant edge cases
- regression of existing behavior affected by the change

Run the relevant project checks available in the repository, such as:

- tests
- lint
- type checking
- build

Do not claim a check passed unless you actually ran it.

If a check cannot be executed, clearly state why.

## Prompt record

Create or update:

`docs/prompts/T-007-validation-errors.md`

Record **this implementation prompt verbatim** in that file according to the prompt-recording convention already used by previous tasks.

Do not overwrite previous prompt history if the repository convention preserves multiple prompts.

## Checklist

After implementation and verification:

Update `docs/IMPLEMENTATION_CHECKLIST.md` only to reflect work that has actually been completed.

Do **not** mark T-007 fully closed if there are unresolved failures, blockers, or acceptance criteria that have not been verified.

## Final response

When finished, report:

1. What was implemented
2. Files changed
3. Tests/checks executed and their results
4. Any assumptions or remaining risks
5. Whether every T-007 acceptance criterion is satisfied
6. Whether T-007 is ready for the final gate

Do not commit or push unless explicitly instructed.
```

## Additional / follow-up prompts

### Prompt #2

```text
Perform the **final independent gate review for T-007**.

T-007 has already been implemented. Do not add new features unless a change is strictly required to fix a verified T-007 defect.

## Source of truth

Review:

- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/T-007-validation-errors.md`
- all T-007-related implementation and tests
- existing project documentation relevant to T-007
- existing patterns established by T-001 through T-006

If `AGENTS.md` is not present, explicitly note that and continue using the repository-local documentation and existing implementation as the source of truth.

## Review scope

Independently verify every T-007 acceptance criterion, including **IC-007.1 through IC-007.7**.

Pay particular attention to:

- centralized ITECH04 error codes and canonical Thai messages
- correctness and consistency of `400`, `404`, `409`, and sanitized `500` responses
- strict validation for missing fields, extra fields, wrong types, malformed values, and invalid enum values
- unmatched-route `404` behavior
- absence of internal/sensitive information in client-facing errors
- consistency across affected controllers/services
- regression risk to T-001 through T-006
- accidental implementation of T-008+ scope
- unnecessary dependencies or schema changes

Do not trust the previous implementation report. Verify the actual code and tests independently.

## Verification

Run the relevant checks available in the repository, including:

- T-007-focused tests
- relevant HTTP/integration tests
- unit tests
- regression tests
- database-backed tests where supported
- typecheck
- lint
- build
- `git diff --check`

Do not claim a check passed unless you actually ran it.

If database-backed tests require disposable infrastructure, use the project's established disposable-test approach and clean it up afterward.

## Findings

Classify any findings as:

- BLOCKER
- HIGH
- MEDIUM
- MINOR

For every finding, provide:

- affected file/location
- problem
- impact
- required fix

Fix only verified issues that are necessary for T-007 acceptance.

After any fix, rerun the affected verification.

## Prompt audit

Verify that:

`docs/prompts/T-007-validation-errors.md`

contains the T-007 implementation prompt record according to the repository convention.

Append **this final-gate prompt verbatim** if the repository convention requires final-gate prompts to be retained.

Do not rewrite or destroy previous prompt history.

## Final decision

Only mark/retain T-007 as `DONE` if:

- IC-007.1 through IC-007.7 are all verified
- no BLOCKER/HIGH/MEDIUM issues remain
- required tests/checks pass
- no unresolved T-007 acceptance criteria remain

If those conditions are not met, do not close T-007.

## Final response

Report:

1. Acceptance criteria verification for IC-007.1–IC-007.7
2. Findings by severity
3. Any fixes made during the gate
4. Exact tests/checks executed and results
5. Remaining risks or limitations
6. Final result: `PASS` or `FAIL`
7. Whether T-007 can be closed

Do not commit or push.
```

## Codex implementation summary

- Consolidated the complete TECH04 error-code set and its canonical Thai messages in a shared, exhaustively typed catalog.
- Changed `ApplicationError` callers across Create Sale, Payment, Cancel, and idempotency-key validation to derive messages from the shared catalog.
- Standardized malformed JSON, unexpected `500`, and unmatched-route `404` responses on the common `{ "error": { "code", "message" } }` envelope.
- Preserved strict Zod boundary validation, approved HTTP statuses, idempotency/state conflict behavior, and sanitized server-side fallback logging.
- Added a dedicated T-007 integration contract suite covering TC-007.1–TC-007.7 and updated the README API/error documentation.
- No dependency, schema, request/correlation ID, or T-008+ behavior was added.

## Files created / modified

- `src/application/errors/application-error.ts`
- `src/application/services/create-sale-service.ts`
- `src/application/services/payment-service.ts`
- `src/application/services/cancel-sale-service.ts`
- `src/http/controllers/create-sale-controller.ts`
- `src/http/controllers/payment-controller.ts`
- `src/http/controllers/cancel-sale-controller.ts`
- `src/http/middleware/error-handler.ts`
- `src/http/validation/idempotency-key.ts`
- `tests/integration/validation-errors.test.ts` (created)
- `README.md`
- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/T-007-validation-errors.md`

## Tests executed

- `npm run test:unit`
- `npx vitest run tests/integration/validation-errors.test.ts tests/integration/http-foundation.test.ts`
- `npm test`
- `docker compose -p t007-test --env-file .env.example up -d mysql`
- `docker compose -p t007-test --env-file .env.example run --build --rm -e NODE_ENV=test -e DB_TEST_CONTEXT=disposable backend npm test`
- `docker compose -p t007-test --env-file .env.example down -v`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`

## Test results

- Unit suite: PASS, 46/46 tests in 6 files.
- Focused T-007 + HTTP foundation: PASS, 29/29 tests in 2 files (18 dedicated T-007 cases).
- Disposable MySQL 8.4 full suite: PASS, 126/126 tests in 13 files.
- Post-review host full regression: PASS, 75 tests; 51 database tests skipped by the intentional disposable-context guard.
- Typecheck: PASS.
- Lint: PASS.
- Build: PASS.
- `git diff --check`: PASS (Git emitted only the repository's existing Windows LF-to-CRLF working-copy warnings).
- The isolated `t007-test` containers, network, and temporary database volume were removed after verification.

## Senior Review findings

- Initial review found one MINOR consistency issue: the new unmatched-route Thai message was outside the shared canonical message catalog while using `VALIDATION_ERROR`.
- Post-fix SRG01 re-review checked requirement correctness, strict validation, fixed-enum exhaustiveness, Thai messages, response/status consistency, exception sanitization, structured logging, TypeScript quality, regressions, and T-007-only scope.
- Final findings: BLOCKER 0, HIGH 0, MEDIUM 0, MINOR 0.

## Fixes made after review

- Reused the canonical `VALIDATION_ERROR` message for unmatched routes.
- Re-ran the full host suite, typecheck, lint, build, and `git diff --check`; all passed.

## Final Task status

DONE — acceptance criteria and TC-007.1–TC-007.7 satisfied; SRG01 and final gate passed.

## Final independent gate review — Prompt #2

### Acceptance criteria verification

- IC-007.1 (checklist TC-007.1): VERIFIED — missing, extra, wrong-type, and malformed request bodies return `400` with the standard envelope.
- IC-007.2 (checklist TC-007.2): VERIFIED — invalid Create Sale product code returns `400`; missing Product and invalid/missing Payment Sale return `404` with fixed codes.
- IC-007.3 (checklist TC-007.3): VERIFIED — state, different-request, and failed-key conflicts return `409` with TECH04 codes.
- IC-007.4 (checklist TC-007.4): VERIFIED — any Cancel JSON body returns `400`; invalid/missing Cancel Sale returns `404` + `SALE_NOT_FOUND`.
- IC-007.5 (checklist TC-007.5): VERIFIED — unexpected exceptions return the generic Thai `500` response without stack, SQL, credential, or exception details.
- IC-007.6 (checklist TC-007.6): VERIFIED — the exported fixed enum exactly matches all 15 TECH04 codes, and the typed message catalog is exhaustive.
- IC-007.7 (checklist TC-007.7): VERIFIED — every catalog message is non-empty and contains Thai text; client responses do not expose internal details.
- Unmatched routes: VERIFIED — `404` uses the standard envelope, `VALIDATION_ERROR`, and its canonical Thai message.
- Scope: VERIFIED — no package/lockfile, database, migration, Compose, or Docker changes; no T-008+ behavior or new dependency.

### Findings

- BLOCKER: 0
- HIGH: 0
- MEDIUM: 0
- MINOR: 0

No fixes were required during this gate.

### Fresh verification executed

- `npx vitest run tests/integration/validation-errors.test.ts tests/integration/http-foundation.test.ts tests/unit/create-sale-http.test.ts tests/unit/payment-http.test.ts tests/unit/cancel-sale-http.test.ts` — PASS, 65/65 tests in 5 files.
- `npm run test:unit` — PASS, 46/46 tests in 6 files.
- `npm test` — PASS, 75 tests; 51 database tests skipped by the required disposable-context guard.
- `docker compose -p t007-final-gate --env-file .env.example up -d mysql` — PASS; fresh isolated MySQL became healthy.
- `docker compose -p t007-final-gate --env-file .env.example run --build --rm -e NODE_ENV=test -e DB_TEST_CONTEXT=disposable backend npm test` — PASS, 126/126 tests in 13 files with no skips.
- `docker compose -p t007-final-gate --env-file .env.example down -v` — PASS; isolated containers, network, and temporary volume removed.
- `npm run typecheck` — PASS.
- `npm run lint` — PASS.
- `npm run build` — PASS.
- `git diff --check` — PASS; only Windows LF-to-CRLF working-copy warnings were emitted.
- `git diff -- package.json package-lock.json src/database compose.yaml Dockerfile` — empty, confirming no dependency, schema, or container-scope changes.

### Final gate decision

PASS — T-007 remains `DONE` and can be closed. Prompt #2 is preserved verbatim. No commit or push was performed.
