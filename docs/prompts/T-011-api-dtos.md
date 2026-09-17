# T-011 — Separate API Request/Response DTOs

## Task ID and title

T-011 — Separate API Request/Response DTOs

## Objective

Make HTTP request/response contracts explicit and discoverable while preserving the existing external API contract exactly.

## Requirement references

T-011; T-011–T-014 Shared Refactor Guardrails; T-001–T-010 Frozen Behavioral Baseline; ES01–ES11; SRG01; AUD01

## Exact user prompt sent to Codex

### Prompt #1 — 2026-09-18

> You are implementing **T-011 — Separate API Request/Response DTOs** for this backend repository.
>
> Before changing any code, read and follow:
>
> * `docs/IMPLEMENTATION_CHECKLIST.md`
> * `docs/API.md`
> * `AGENTS.md` and any applicable nested AGENTS instructions
> * existing implementation and tests for Create Sale, Payment, and Cancel
> * existing validation schemas, controllers, services, domain/application models, repositories, and OpenAPI/Swagger definitions
> * existing prompt-audit conventions under `docs/prompts/`
>
> Treat **T-001–T-010 as the Frozen Behavioral Baseline**.
>
> ## Objective
>
> Make the HTTP request/response contracts explicit and discoverable while preserving the existing external API contract exactly.
>
> Review all existing FE-facing endpoints:
>
> * `POST /api/v1/sales`
> * `POST /api/v1/sales/{sale_id}/payment`
> * `POST /api/v1/sales/{sale_id}/cancel`
>
> Introduce a clear HTTP DTO structure where it provides useful boundary separation.
>
> ## Required design direction
>
> 1. Keep HTTP Request/Response DTOs separate from:
>
>    * application Command/Result types
>    * domain models
>    * database/repository models
>
> 2. For request DTOs:
>
>    * Prefer deriving TypeScript request types from the existing validation schemas where practical.
>    * Avoid duplicating schema definitions and TypeScript types in ways that can drift apart.
>    * Do NOT rewrite or change validation rules as part of this task.
>
> 3. For response DTOs:
>
>    * Introduce explicit response DTOs and/or mapping at the HTTP boundary where this provides clear separation.
>    * Do not expose application/domain/database objects directly merely because their current shape happens to match the HTTP response.
>    * Keep mapping simple and explicit; do not introduce unnecessary generic mapper frameworks.
>
> 4. Controllers should become clearer HTTP-boundary components:
>
>    * parse/validate HTTP input using the existing behavior
>    * translate validated HTTP data into the existing application input where needed
>    * invoke the application/service layer
>    * map application results to the existing HTTP response contract
>
> 5. Update imports/references affected by the structural refactor.
>
> 6. Preserve existing OpenAPI/Swagger consumer-visible behavior exactly.
>
> ## NON-NEGOTIABLE behavioral guardrails
>
> Do NOT change:
>
> * endpoint paths
> * HTTP methods
> * request headers
> * request JSON field names/types/required fields
> * response JSON field names/types/null semantics/date formats
> * HTTP status codes
> * error codes
> * Thai error messages
> * validation behavior
> * strictness/coercion behavior
> * unknown-field behavior
> * malformed JSON behavior
> * business rules
> * Sale lifecycle/state behavior
> * database schema
> * migrations
> * seed data
> * SQL behavior
> * transaction boundaries
> * commit/rollback behavior
> * locking strategy
> * lock acquisition/order
> * idempotency algorithm
> * request fingerprint behavior
> * replay/conflict behavior
> * concurrency behavior
> * Docker/runtime behavior
>
> Do NOT weaken, delete, skip, or rewrite existing tests merely to make the refactor pass.
>
> Do NOT perform T-012, T-013, or T-014 work unless a minimal compatibility adjustment is strictly required for T-011.
>
> Do NOT introduce speculative abstractions, generic DTO frameworks, unnecessary base classes, or architecture for hypothetical future endpoints.
>
> If implementing T-011 requires changing any approved behavior from T-001–T-010:
>
> **STOP and report the required behavioral change. Do not make that change automatically.**
>
> ## Before implementation
>
> Inspect the current implementation and report briefly:
>
> 1. Where request types currently live.
> 2. Where response shapes/types currently live.
> 3. Whether controllers currently depend directly on application/domain/database-shaped objects.
> 4. The minimal DTO structure you intend to introduce.
> 5. Files expected to change.
>
> Then implement T-011.
>
> ## Verification
>
> Run the existing gates in this order:
>
> ```text
> typecheck
> lint
> build
> existing tests / regression tests
> ```
>
> Run relevant integration tests covering all three endpoints and ensure existing validation, idempotency, transaction, locking, concurrency, and response-contract behavior remains unchanged.
>
> Do not modify expected test behavior to accommodate the refactor.
>
> Review the resulting diff specifically for accidental API-contract or behavioral changes.
>
> ## Prompt Audit
>
> Preserve the existing AUD01 convention.
>
> Create/update the appropriate T-011 prompt audit file under `docs/prompts/` and record this implementation prompt verbatim according to the repository's existing audit format.
>
> Do not mark T-011 `DONE` yet unless the existing workflow explicitly allows it before Senior Review / Final Gate.
>
> ## Completion report
>
> When implementation and verification are complete, report:
>
> 1. Files changed
> 2. DTO structure introduced
> 3. Request types derived from validation schemas, if applicable
> 4. Response mappings introduced
> 5. Any application/domain/database coupling removed from the HTTP boundary
> 6. Confirmation that external API behavior remains unchanged
> 7. Commands/tests executed and exact results
> 8. Any risks or follow-up findings
> 9. Prompt-audit file updated
> 10. Recommended T-011 status (`IN_PROGRESS`, `REVIEW`, or `BLOCKED`)
>
> Do not start T-012.

## Additional / follow-up prompts

### Prompt #2 — 2026-09-18

> Perform an **independent Senior Review and Final Gate for T-011 — Separate API Request/Response DTOs**.
>
> Do NOT start T-012.
>
> Read and follow:
>
> * `docs/IMPLEMENTATION_CHECKLIST.md`
> * `docs/API.md`
> * `AGENTS.md` and applicable nested instructions
> * `docs/prompts/T-011-api-dtos.md`
> * the complete T-011 diff
> * existing tests covering Create Sale, Payment, and Cancel
>
> Treat **T-001–T-010 as the Frozen Behavioral Baseline**.
>
> ## Review objective
>
> Review T-011 as a Senior Backend Developer.
>
> Do not assume the implementation is correct merely because tests pass.
>
> Verify that the refactor improves HTTP boundary separation without changing any externally observable or business behavior.
>
> ## Review the complete diff
>
> Inspect every T-011 change and verify:
>
> ### 1. Request DTO boundary
>
> Confirm that:
>
> * request DTOs are appropriately derived from the existing validation schemas where practical
> * schema/type drift has not been introduced
> * validation rules were not accidentally changed
> * HTTP request DTOs are not being reused incorrectly as domain/database models
> * no unnecessary duplicate request types were introduced
>
> ### 2. Response DTO boundary
>
> Confirm that:
>
> * HTTP response DTOs are explicit where useful
> * application/domain/database objects are not accidentally exposed directly
> * response mapping occurs at an appropriate HTTP boundary
> * mapping remains simple and explicit
> * no unnecessary generic mapper/framework abstraction was introduced
>
> Pay particular attention to:
>
> * snake_case vs camelCase
> * field names
> * field presence/absence
> * optional fields
> * null/undefined behavior
> * integer values
> * UUIDs
> * enum/status values
> * `Date` → ISO 8601 UTC serialization
> * CASH `change`
> * QR response without `change`
> * cancelled/expired Sale responses
>
> ### 3. Layer responsibilities
>
> Verify the resulting dependency direction remains appropriate:
>
> ```text
> Route
>   ↓
> Controller / HTTP DTO boundary
>   ↓
> Application Service / Command / Result
>   ↓
> Domain
>   ↓
> Repository / MySQL
> ```
>
> Confirm that HTTP-specific serialization/types were actually removed from inappropriate domain/application locations where intended.
>
> Also confirm T-011 did not accidentally perform T-012, T-013, or T-014 architectural work beyond minimal compatibility changes.
>
> ### 4. Frozen Behavioral Baseline
>
> Verify there is NO change to:
>
> * API endpoint paths/methods
> * request headers
> * request JSON contracts
> * response JSON contracts
> * HTTP status codes
> * error codes/messages/mapping
> * validation semantics
> * business rules
> * Sale lifecycle/state behavior
> * database schema/migrations/seed
> * SQL behavior
> * transaction boundaries
> * commit/rollback behavior
> * locking strategy/order
> * idempotency algorithm/fingerprint/replay/conflict behavior
> * concurrency behavior
> * Docker/runtime behavior
> * OpenAPI/Swagger consumer-visible contract
>
> Compare implementation against `docs/API.md`, existing tests, and the pre-T-011 behavior where necessary.
>
> ## Regression/Test integrity review
>
> Do not only check whether tests pass.
>
> Review T-011 test modifications and determine whether any assertion was:
>
> * weakened
> * removed
> * rewritten to accept changed behavior
> * made less specific
> * changed merely to make the refactor pass
>
> Tests must continue proving the Frozen Behavioral Baseline.
>
> Run final gates in this order:
>
> ```text
> typecheck
> lint
> build
> existing tests / regression tests
> ```
>
> Run the relevant Docker/MySQL integration suite as required by the repository.
>
> Also run `git diff --check`.
>
> ## Finding severity
>
> Report findings as:
>
> * BLOCKER
> * MAJOR
> * MINOR
>
> For every finding provide:
>
> * ID
> * severity
> * file/location
> * problem
> * why it matters
> * minimal recommended fix
>
> If a finding can be safely fixed without changing the Frozen Behavioral Baseline, implement the minimal fix and rerun the affected gates.
>
> If fixing a finding requires changing approved behavior from T-001–T-010:
>
> **STOP. Do not make the behavioral change. Report it for explicit approval.**
>
> ## Final Gate
>
> T-011 may be marked `DONE` only if:
>
> * all T-011 Acceptance Criteria pass
> * no unresolved BLOCKER/MAJOR/MINOR findings remain
> * external API behavior is unchanged
> * regression tests pass
> * Docker/MySQL relevant tests pass
> * OpenAPI/Swagger consumer-visible behavior remains unchanged
> * prompt audit is complete
> * T-012 has not been started
>
> If all conditions pass:
>
> 1. update `docs/IMPLEMENTATION_CHECKLIST.md`
> 2. set T-011 `Current Status: DONE`
> 3. record concise implementation/review evidence
> 4. update `docs/prompts/T-011-api-dtos.md` with the Senior Review / Final Gate prompt and actual results according to AUD01
> 5. update `docs/prompts/README.md` if required by the existing audit convention
>
> ## Final report
>
> Return:
>
> 1. Senior Review result: PASS or FAIL
> 2. Findings grouped by severity
> 3. Fixes made, if any
> 4. Final verification commands and exact results
> 5. Frozen Behavioral Baseline verification
> 6. OpenAPI/Swagger verification
> 7. Prompt audit verification
> 8. Confirmation that T-012 was not started
> 9. Final T-011 status: `DONE`, `REVIEW`, or `BLOCKED`

## Codex implementation summary

- Added explicit Sale, Payment, and Cancelled Sale response DTOs and simple HTTP-boundary mappers under `src/http/dtos/`.
- Derived Create Sale and Payment request DTO types directly from the unchanged inline Zod schemas; validation schemas remain in the controllers so T-012 was not started.
- Changed Create Sale and Payment application results to return camelCase domain/application views with `Date` values instead of HTTP-shaped snake_case response objects.
- Updated all three controllers to translate validated request DTOs into commands and application results into the unchanged public JSON contracts.
- Removed response DTOs and response serialization from domain modules. No repository/database models are exposed by the HTTP boundary.
- OpenAPI, routes, validation behavior, business rules, SQL, transaction boundaries, locking, idempotency, concurrency, migrations, seed data, dependencies, and runtime behavior were not changed.

## Files created / modified

- `src/http/dtos/sale-response-dto.ts`
- `src/http/dtos/payment-response-dto.ts`
- `src/http/dtos/cancelled-sale-response-dto.ts`
- `src/http/controllers/create-sale-controller.ts`
- `src/http/controllers/payment-controller.ts`
- `src/http/controllers/cancel-sale-controller.ts`
- `src/application/services/create-sale-service.ts`
- `src/application/services/payment-service.ts`
- `src/domain/sale.ts`
- `src/domain/payment.ts`
- `tests/unit/create-sale-http.test.ts`
- `tests/unit/payment-http.test.ts`
- `tests/unit/business-rules.test.ts`
- `tests/integration/create-sale.test.ts`
- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/README.md`
- `docs/prompts/T-011-api-dtos.md`

## Tests executed

- Pre-change baseline: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`
- Focused verification: `npm run test:unit`
- Post-change gates in required order: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`
- Full Docker/MySQL verification: `npm run test:docker`
- Independent Senior Review gates: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, `npm run test:docker`
- Diff checks: `git diff --check`, scoped `git diff`, and `git status --short`

## Test results

- Pre-change typecheck, lint, and build: PASS.
- Pre-change host regression: PASS — 86 passed; 58 database-context tests skipped as designed.
- Focused unit suite: PASS — 57/57.
- Post-change typecheck, lint, and build: PASS.
- Post-change host regression: PASS — 86 passed; 58 database-context tests skipped as designed.
- Docker/MySQL integration and environment gate: PASS — 144/144, including all three endpoints, validation, response contracts, idempotency, rollback, transactions, locking, concurrency, schema, seed, readiness, networking, and persistence.
- Independent Senior Review rerun: typecheck, lint, and build PASS; host regression PASS — 86 passed and 58 guarded skips; isolated Docker/MySQL gate PASS — 144/144.
- OpenAPI regression PASS — 2/2 within both host and Docker suites; `src/http/openapi.ts` and `docs/API.md` were unchanged.
- The first sandboxed Docker attempt could not access the Docker config/pipe; the approved retry passed and cleaned up all isolated resources. This was an execution-environment restriction, not a repository failure.
- `git diff --check`: PASS; only expected Windows line-ending warnings were emitted.

## Senior Review findings

Independent SRG01 result: `PASS`.

- BLOCKER: none.
- MAJOR: none.
- MINOR: none.
- Request DTO derivation, response DTO mapping, dependency direction, test integrity, Frozen Behavioral Baseline, and scope control all pass review.

## Fixes made after review

None. The independent review found no issue requiring a code or test change.

## Final Task status

DONE — all T-011 acceptance criteria, independent SRG01, host regression, Docker/MySQL verification, OpenAPI verification, scoped diff review, and AUD01 pass. T-012 was not started.
