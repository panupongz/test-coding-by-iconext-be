# T-012 — Separate HTTP Validation Schemas

## Task ID and title

T-012 — Separate HTTP Validation Schemas

## Objective

Move HTTP/request validation schemas into clear HTTP-boundary modules while preserving existing validation and external behavior exactly.

## Requirement references

T-012; T-011–T-014 Shared Refactor Guardrails; T-001–T-010 Frozen Behavioral Baseline; ES01–ES11; SRG01; AUD01

## Exact user prompt sent to Codex

### Prompt #1 — 2026-09-18

> You are implementing **T-012 — Separate HTTP Validation Schemas** in the backend repository on branch `feature/implement`.
>
> Before making any change, read and follow:
>
> * `AGENTS.md` and any applicable nested agent instructions
> * `docs/IMPLEMENTATION_CHECKLIST.md`
> * `docs/API.md`
> * `docs/prompts/README.md`
> * the completed T-011 implementation and its prompt audit
> * relevant existing validation, controller, DTO, service, and test files
>
> Treat **T-001–T-010 as the Frozen Behavioral Baseline** and **T-011 as the current structural baseline**.
>
> ## Objective
>
> Move HTTP/request validation schemas into clear HTTP-boundary modules so controllers are more focused on HTTP orchestration, while preserving existing validation and external behavior exactly.
>
> This is a **structural refactor only**.
>
> Do not change business behavior.
>
> ## Required scope
>
> 1. Inventory the existing request/path/header/body validation schemas used by all current FE-facing endpoints:
>
>    * Create Sale
>    * Payment
>    * Cancel
>
> 2. Identify validation definitions currently living inside controllers or otherwise mixed with controller orchestration.
>
> 3. Move those schemas into an appropriate HTTP validation/schema structure.
>
> 4. Keep validation schemas in the HTTP boundary. Do not move HTTP validation into the application, domain, repository, or database layers.
>
> 5. Preserve the existing validation rules exactly. In particular, preserve:
>
>    * required vs optional fields
>    * strict object behavior
>    * unknown/extra-field rejection
>    * type checking
>    * coercion behavior
>    * string/number constraints
>    * UUID/path validation
>    * `Idempotency-Key` validation
>    * malformed JSON behavior
>    * Cancel body rejection
>    * validation execution/order where externally observable
>    * error code/message/status mapping
>
> 6. Do **not** rewrite or consolidate schemas merely for style.
>
> 7. Centralize a validation schema/helper only when actual reuse already exists and doing so does not alter validation semantics or error ordering.
>
> 8. Where appropriate, derive HTTP request DTO types from the corresponding validation schemas so runtime validation and compile-time request types cannot drift.
>
> 9. Keep HTTP DTOs/schemas separate from:
>
>    * application Commands/Results
>    * domain models
>    * repository/database models
>
> 10. Update controller imports/references so controllers primarily:
>
> * receive HTTP input
> * invoke the existing validation
> * translate validated HTTP DTOs into application commands
> * invoke services
> * map application results into HTTP response DTOs
>
> Do not move business logic into validation modules.
>
> ## Frozen behavior — MUST NOT CHANGE
>
> Do not change:
>
> * endpoint paths or HTTP methods
> * request headers
> * request JSON contract
> * response JSON contract
> * response field names/types/null semantics/date formats
> * HTTP status codes
> * error codes
> * Thai error messages
> * error mapping
> * validation semantics
> * business rules
> * Sale state transitions
> * database schema
> * migrations
> * seed data
> * SQL/query behavior
> * repository behavior
> * transaction boundaries
> * commit/rollback behavior
> * locking strategy or lock ordering
> * idempotency algorithm
> * request fingerprint behavior
> * replay/conflict behavior
> * concurrency behavior
> * Docker/runtime behavior
> * OpenAPI/Swagger consumer-visible contract
> * README/API documented behavior
>
> Do not add dependencies unless absolutely necessary. Prefer the existing Zod setup.
>
> Do not weaken, delete, skip, or rewrite existing tests merely to make this refactor pass.
>
> If implementing T-012 appears to require any change to the Frozen Behavioral Baseline, **STOP and report the required behavioral change instead of implementing it.**
>
> ## Scope control
>
> Implement **T-012 only**.
>
> Do not start:
>
> * T-013 service-responsibility cleanup
> * T-014 repository-boundary refactor
>
> Avoid opportunistic cleanup unrelated to validation-schema separation.
>
> Do not introduce generic validation frameworks, factories, manager classes, or unnecessary abstractions.
>
> ## Before implementation
>
> Run the existing baseline gates in this order:
>
> 1. typecheck
> 2. lint
> 3. build
> 4. existing tests/regression tests
>
> Record the actual results.
>
> If the baseline is failing before your changes, stop and report the failure before modifying production code.
>
> ## Testing after implementation
>
> Run the relevant gates again in this order:
>
> 1. typecheck
> 2. lint
> 3. build
> 4. existing tests/regression tests
>
> Also run focused validation tests and the existing isolated Docker/MySQL/full integration gate where applicable.
>
> Explicitly verify that:
>
> * previously valid Create Sale requests remain valid
> * previously invalid Create Sale requests remain invalid with equivalent HTTP/error behavior
> * previously valid Payment requests remain valid
> * previously invalid Payment requests remain invalid with equivalent HTTP/error behavior
> * Cancel still rejects any JSON body, including `{}`
> * invalid/missing Sale behavior is unchanged
> * `Idempotency-Key` validation behavior is unchanged
> * malformed JSON behavior is unchanged
> * unknown/extra fields behave exactly as before
> * wrong types are not implicitly coerced
> * validation/error ordering remains equivalent
> * Thai error messages and TECH04 error codes remain unchanged
> * OpenAPI/Swagger consumer-visible contract remains unchanged
> * T-011 response DTO mappings remain unchanged
> * no DB/transaction/locking/idempotency/concurrency behavior changed
>
> Run `git diff --check` and review the final scoped diff.
>
> ## Prompt audit
>
> Follow AUD01.
>
> Create/update the appropriate T-012 prompt audit file under `docs/prompts/` following the existing repository convention.
>
> Store this Prompt #1 **verbatim**.
>
> Record:
>
> * objective
> * files changed
> * implementation summary
> * baseline test results
> * post-change test results
> * validation regression results
> * Docker/MySQL/full-suite results where applicable
> * any findings/fixes
> * current task status
>
> Do not mark T-012 `DONE` yet.
>
> After implementation and tests pass, update `docs/IMPLEMENTATION_CHECKLIST.md` with factual implementation evidence and move T-012 only to the appropriate review state according to the existing workflow.
>
> Leave the task ready for an **independent Senior Review / Final Gate**.
>
> ## Expected final response
>
> Report:
>
> 1. What validation schemas were moved and where
> 2. Which controllers/imports changed
> 3. Whether request DTO types are now derived from schemas
> 4. Confirmation that validation semantics and API behavior were preserved
> 5. Files changed
> 6. Baseline gate results
> 7. Post-refactor gate/test results
> 8. Docker/MySQL/full integration results
> 9. `git diff --check` result
> 10. Prompt-audit/checklist updates
> 11. Any remaining risks or findings
> 12. Final status of T-012
>
> Do not claim `DONE` unless the independent Senior Review / Final Gate has actually passed.

## Additional / follow-up prompts

### Prompt #2 — 2026-09-18

> Perform an **independent Senior Review / Final Gate for T-012 — Separate HTTP Validation Schemas**.
>
> Do NOT assume the implementation is correct merely because the implementation-stage tests passed.
>
> Before reviewing, read and follow:
>
> * `AGENTS.md` and applicable nested instructions
> * `docs/IMPLEMENTATION_CHECKLIST.md`
> * `docs/API.md`
> * `docs/prompts/README.md`
> * `docs/prompts/T-012-http-validation-schemas.md`
> * the completed T-011 implementation/audit where relevant
> * all T-012 changed source and test files
> * relevant controllers, validation modules, DTOs, error handling, OpenAPI definitions, and regression tests
>
> Treat **T-001–T-010 as the Frozen Behavioral Baseline** and **T-011 as the structural baseline immediately before T-012**.
>
> ## Review objective
>
> Independently verify that T-012 is a structural HTTP-validation refactor only and that moving validation schemas out of controllers did not change any externally observable or business behavior.
>
> Do not perform unrelated cleanup.
>
> ## Required review
>
> Inspect the complete T-012 diff and verify:
>
> ### 1. Validation semantics
>
> For Create Sale, Payment, and Cancel, verify that the refactored schemas preserve exactly:
>
> * required/optional fields
> * strict object behavior
> * unknown/extra-field rejection
> * type checking
> * non-coercion behavior
> * string/number constraints
> * product-code validation
> * UUID/path validation
> * payment-method validation
> * amount validation
> * `Idempotency-Key` behavior
> * malformed JSON behavior
> * Cancel no-body behavior, including rejection of `{}`
> * validation execution/order where externally observable
> * HTTP status mapping
> * TECH04 error-code mapping
> * Thai error messages
>
> Compare the new validation modules against the pre-T-012 controller behavior rather than reviewing the new code in isolation.
>
> ### 2. Boundary architecture
>
> Verify that:
>
> * HTTP validation remains in the HTTP layer
> * controllers are focused on HTTP orchestration
> * request DTO types are derived from schemas where appropriate
> * HTTP request DTOs are not reused as application/domain/database models
> * T-011 response DTO/mapping boundaries remain intact
> * no business logic was moved into validation modules
> * reusable schemas were centralized only where genuine reuse exists
> * no unnecessary abstraction/framework/factory was introduced
>
> ### 3. Frozen Behavioral Baseline
>
> Confirm T-012 did NOT change:
>
> * API paths/methods
> * request headers
> * request JSON contract
> * response JSON contract
> * HTTP statuses
> * error contract
> * validation behavior
> * business rules/state transitions
> * services/application behavior
> * repositories or SQL
> * schema/migrations/seed
> * transaction boundaries
> * commit/rollback behavior
> * locking or lock ordering
> * idempotency/fingerprint/replay/conflict behavior
> * concurrency behavior
> * Docker/runtime behavior
> * dependencies
> * OpenAPI/Swagger consumer-visible contract
>
> Also confirm that T-013 and T-014 have not been started.
>
> ### 4. Test integrity
>
> Review test changes, if any.
>
> Verify that no existing test was:
>
> * removed
> * weakened
> * skipped
> * made less strict
> * changed merely to accept new behavior
>
> Confirm existing assertions still protect the Frozen Behavioral Baseline.
>
> ## Independent verification
>
> Run fresh gates in this exact order:
>
> 1. typecheck
> 2. lint
> 3. build
> 4. existing host regression tests
>
> Then run:
>
> * focused validation/HTTP tests
> * OpenAPI contract tests
> * relevant unit tests
> * isolated Docker/MySQL full integration/regression gate
> * `git diff --check`
>
> Record actual counts/results.
>
> Explicitly verify regression coverage for:
>
> * Create Sale valid/invalid requests
> * Payment valid/invalid requests
> * Cancel body/no-body behavior
> * malformed JSON
> * missing/extra/wrong-type fields
> * non-coercion
> * invalid UUID/Sale handling
> * Idempotency-Key validation
> * validation/error ordering
> * Thai messages
> * TECH04 codes
> * response DTO contract
> * OpenAPI/Swagger contract
> * idempotency
> * rollback
> * locking/concurrency
>
> ## Findings
>
> Classify findings as:
>
> * BLOCKER
> * MAJOR
> * MINOR
> * NOTE
>
> For every finding, provide:
>
> * file/location
> * concrete issue
> * why it matters
> * whether it violates T-012 or the Frozen Behavioral Baseline
> * required fix
>
> If any BLOCKER, MAJOR, or behavior-affecting finding exists:
>
> 1. Do not mark T-012 DONE.
> 2. Fix only findings that are within T-012 scope.
> 3. Re-run affected tests and all required final gates.
> 4. Document the finding and fix in the prompt audit.
>
> If fixing a finding requires changing approved behavior from T-001–T-010, **STOP and report it for explicit approval.**
>
> ## Final Gate decision
>
> T-012 may be marked `DONE` only when:
>
> * all T-012 acceptance criteria pass
> * validation semantics are confirmed unchanged
> * Frozen Behavioral Baseline is preserved
> * no unresolved BLOCKER/MAJOR/MINOR finding remains
> * required regression/integration gates pass
> * OpenAPI/Swagger contract remains unchanged
> * prompt audit contains the actual Senior Review evidence
>
> If all conditions pass:
>
> 1. Update `docs/IMPLEMENTATION_CHECKLIST.md`
>
>    * T-012 `Current Status` → `DONE`
>    * mark its completed sub-tasks and Acceptance Criteria
>    * add factual Senior Review / Final Gate evidence
>
> 2. Append this Prompt #2 **verbatim** and its actual results/findings to:
>    `docs/prompts/T-012-http-validation-schemas.md`
>
> 3. Preserve all historical Prompt #1 content verbatim.
>
> ## Final response
>
> Report:
>
> 1. Senior Review findings by severity
> 2. Any fixes made
> 3. Validation-semantic comparison result
> 4. Frozen Behavioral Baseline result
> 5. Test-integrity review result
> 6. Typecheck result
> 7. Lint result
> 8. Build result
> 9. Host regression result/count
> 10. Focused validation/OpenAPI/unit results
> 11. Docker/MySQL full-gate result/count
> 12. `git diff --check` result
> 13. Prompt-audit/checklist updates
> 14. Final T-012 status: `DONE` or not, with the reason

## Codex implementation summary

- Moved Create Sale body and product-code schemas from the controller to `src/http/validation/create-sale-request.ts` without changing their Zod definitions.
- Moved the Payment body schema and existing supported-payment-method validation helper to `src/http/validation/payment-request.ts` without changing their rules or error mapping.
- Centralized the identical Payment/Cancel UUID schema in `src/http/validation/sale-id.ts`, the only schema reuse introduced.
- Moved the Cancel no-body validation definition to `src/http/validation/cancel-sale-request.ts` as a schema accepting only `undefined`.
- Kept the shared `Idempotency-Key` helper unchanged in `src/http/validation/idempotency-key.ts`.
- Preserved controller validation execution order, HTTP errors, Thai messages, malformed-JSON handling, request/response contracts, and all application/database behavior.

## Files created / modified

- `src/http/validation/create-sale-request.ts`
- `src/http/validation/payment-request.ts`
- `src/http/validation/cancel-sale-request.ts`
- `src/http/validation/sale-id.ts`
- `src/http/controllers/create-sale-controller.ts`
- `src/http/controllers/payment-controller.ts`
- `src/http/controllers/cancel-sale-controller.ts`
- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/README.md`
- `docs/prompts/T-012-http-validation-schemas.md`

## Tests executed

- Pre-change baseline: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`
- Post-change gates: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`
- Focused validation/API verification: `npx vitest run tests/unit/create-sale-http.test.ts tests/unit/payment-http.test.ts tests/unit/cancel-sale-http.test.ts tests/integration/validation-errors.test.ts tests/unit/openapi.test.ts`
- Full isolated Docker/MySQL verification: `npm run test:docker`
- Diff verification: `git diff --check` and scoped `git diff`

## Test results

- Pre-change typecheck, lint, and build: PASS.
- Pre-change host regression: PASS — 86 passed; 58 database-context tests skipped as designed.
- Post-change typecheck, lint, and build: PASS.
- Post-change host regression: PASS — 86 passed; 58 database-context tests skipped as designed.
- Focused Create Sale, Payment, Cancel, validation-error, and OpenAPI suite: PASS — 56/56.
- Isolated Docker/MySQL gate: PASS — 144/144. The first sandboxed attempt could not access the Docker config/engine; the approved retry passed and removed all isolated resources.
- OpenAPI regression: PASS — 2/2 within the focused and full suites; `src/http/openapi.ts` and `docs/API.md` are unchanged.

## Findings / fixes

- No behavioral change or Frozen Behavioral Baseline conflict was required.
- No production dependency was added and no test was changed.
- Scoped diff review found no change to routes, OpenAPI, services, repositories, database schema, SQL, transactions, locking, idempotency, concurrency, response DTO mappings, or runtime configuration.
- Pre-existing NOTE: `docs/API.md` documents JSON `null` on Cancel as `VALIDATION_ERROR`, but the unchanged strict JSON parser and existing regression test produce `MALFORMED_JSON`. This is not a T-012 regression and was not changed within this structural-refactor scope.
- `git diff --check`: PASS; only expected Windows line-ending warnings were emitted.

## Senior Review / Final Gate — 2026-09-18

- Result: PASS.
- Findings: no BLOCKER, MAJOR, or MINOR findings. One non-blocking, pre-existing NOTE is recorded below.
- Fixes: none; the independent review found no source or test defect requiring a change.
- NOTE — `docs/API.md:189` versus `tests/unit/cancel-sale-http.test.ts:82`: the document says a JSON `null` Cancel body returns `400 VALIDATION_ERROR`, while Express strict JSON parsing reaches the malformed-JSON handler and the unchanged test expects `MALFORMED_JSON`. It matters because prose and runtime differ, but it is not caused by T-012 and T-012 preserves the pre-task runtime/test baseline exactly. Required fix: none within T-012; reconcile the historical documentation-versus-runtime decision in a separately authorized task because either choice changes a frozen artifact.
- Direct comparison with the pre-T-012 `HEAD` controllers confirmed unchanged Create Sale and Payment Zod chains, unchanged payment-method validation/error mapping, and the same `z.uuid()` path semantics for Payment and Cancel.
- Cancel's new `z.undefined()` schema accepts exactly the old `request.body === undefined` condition. Existing Express JSON parsing and malformed-JSON handling are unchanged.
- Validation order remains Create Sale header → body → product code; Payment path → header → body → payment method; Cancel path → header → body absence.
- Boundary architecture PASS: all request validation stays under `src/http/validation/`; request DTOs are schema-derived; HTTP DTOs are not used by application/domain/database code; T-011 response mappings remain unchanged; no generic validation framework was introduced.
- Frozen Behavioral Baseline PASS: the diff contains no change to routes, headers, request/response contracts, statuses, errors/messages, business rules, services, repositories, SQL, schema, migrations, seed, transactions, locking, idempotency, concurrency, Docker/runtime, dependencies, or OpenAPI. T-013 and T-014 remain `TODO`.
- Test integrity PASS: no test file or assertion was changed, removed, weakened, or skipped for T-012.
- Independent gates in required order: typecheck PASS; lint PASS; build PASS; host regression PASS — 86 passed, 58 guarded skips.
- Focused validation plus unit verification PASS — 75/75 combined; complete unit suite PASS — 57/57; OpenAPI PASS — 2/2 within those suites.
- Isolated Docker/MySQL full gate PASS — 144/144, including Create Sale, Payment, Cancel, validation/error contracts, response DTOs, idempotency, rollback, transactions, locking, concurrency, schema, seed, readiness, networking, and volume persistence. Isolated resources were removed successfully.
- `git diff --check` PASS with expected Windows line-ending warnings only.

## Current Task status

DONE — all T-012 acceptance criteria and the independent Senior Review / Final Gate pass with no unresolved findings.
