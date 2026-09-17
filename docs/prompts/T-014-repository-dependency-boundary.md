# T-014 — Review Repository Dependency Boundary

## Task ID and title

T-014 — Review Repository Dependency Boundary

## Objective

Review the dependency boundary between application services and concrete database repositories, introducing a repository interface/port only when concrete dependency-direction or testability value justifies the additional indirection.

## Requirement references

T-014; T-011–T-014 Shared Refactor Guardrails; T-001–T-010 Frozen Behavioral Baseline; T-011 HTTP DTO baseline; T-012 HTTP validation baseline; T-013 service-responsibility baseline; ES01–ES11; SRG01; AUD01

## Exact user prompt sent to Codex

### Prompt #1 — 2026-09-18

> You are implementing **T-014 — Review Repository Dependency Boundary** in the backend repository on branch `feature/implement`.
>
> This task is explicitly:
>
> **Review first → Refactor only if justified.**
>
> A documented **no-code-change outcome is valid and preferred** when introducing repository interfaces/ports would not provide concrete dependency-direction or testability value.
>
> Do not introduce abstractions merely to satisfy an architectural pattern.
>
> Before making any production-code change, read and follow:
>
> * `AGENTS.md` and all applicable nested instructions
> * `docs/IMPLEMENTATION_CHECKLIST.md`
> * `docs/API.md`
> * `docs/prompts/README.md`
> * completed T-011, T-012, and T-013 prompt audits
> * relevant application services
> * repository/data-access implementations
> * database/transaction infrastructure
> * composition/wiring code
> * domain/application types
> * repository/unit/integration tests
>
> Treat:
>
> * **T-001–T-010 as the Frozen Behavioral Baseline**
> * **T-011 as the completed HTTP DTO baseline**
> * **T-012 as the completed HTTP validation baseline**
> * **T-013 as the completed service-responsibility baseline**
>
> ## Objective
>
> Review the dependency boundary between the application layer and concrete database repositories.
>
> Determine whether introducing repository interfaces/ports provides **concrete dependency-direction or testability value**.
>
> Do not assume repository interfaces are automatically better architecture.
>
> A no-production-code-change result is acceptable when the existing concrete repository dependencies are simple, explicit, and sufficiently testable.
>
> ## Phase 1 — Inventory before changing code
>
> Before modifying production code, inventory all application-layer dependencies on concrete repository/data-access implementations.
>
> For each dependency, document:
>
> 1. consuming application service/module
> 2. concrete repository/data-access dependency
> 3. methods used
> 4. input types
> 5. return types
> 6. null/not-found semantics
> 7. transaction/connection requirements
> 8. row-lock requirements
> 9. whether the repository receives a transaction/pinned connection
> 10. whether tests currently require a real repository/database or can already substitute the dependency
> 11. current composition/wiring mechanism
> 12. whether the dependency creates a concrete maintainability/testability problem
>
> Pay particular attention to:
>
> * Create Sale
> * Payment
> * Cancel
> * idempotency persistence/access
> * Sale row locking
> * Product lookup
> * Payment persistence
> * expiry/state transitions
>
> ## Phase 2 — Evaluate abstraction value
>
> For each concrete dependency, determine whether an interface/port would provide measurable value.
>
> A repository interface/port is justified only when there is concrete evidence such as:
>
> * application code is unnecessarily coupled to MySQL-specific implementation details
> * unit testing application logic is materially difficult because concrete database repositories cannot be substituted
> * the application layer directly depends on infrastructure-only implementation details
> * multiple implementations already exist or a real substitution boundary is required
> * the interface would establish a meaningful dependency direction without duplicating concrete repository APIs mechanically
>
> Do NOT justify an interface solely because:
>
> * “Clean Architecture recommends interfaces”
> * “SOLID/DIP says dependencies should be abstract”
> * repository classes are concrete
> * interfaces look architecturally cleaner
> * mocking might theoretically be useful someday
> * every repository should have an interface
>
> Avoid speculative abstraction.
>
> ## Refactor decision
>
> For every proposed interface/port, explain **before implementing**:
>
> * concrete current problem
> * affected application code
> * proposed boundary
> * exact methods required by consumers
> * why the interface belongs at that boundary
> * concrete testability/dependency-direction benefit
> * why the benefit outweighs additional indirection
> * why this is not premature abstraction
>
> Prefer consumer-driven, narrow contracts if an abstraction is justified.
>
> Do not blindly copy every public method from a concrete repository into an interface.
>
> If no proposed abstraction meets this threshold:
>
> **Do not modify production architecture.**
>
> Document the no-code-change decision and proceed with verification, audit, and checklist updates.
>
> A no-code-change result can fully satisfy T-014.
>
> ## If an interface/port is justified
>
> Keep the change minimal.
>
> The interface/port should describe what the application requires, not expose infrastructure implementation details unnecessarily.
>
> Keep the concrete MySQL/data-access implementation in the existing appropriate infrastructure/database layer.
>
> Keep composition/wiring explicit.
>
> Do not introduce a dependency-injection framework.
>
> Do not rewrite SQL.
>
> Do not alter repository query implementation merely to conform to a preferred style.
>
> Preserve exactly:
>
> * query behavior
> * query ordering where behaviorally significant
> * returned values
> * null/not-found semantics
> * transaction connection propagation
> * pinned connection behavior
> * `SELECT ... FOR UPDATE`
> * row-lock timing
> * advisory-lock behavior
> * transaction boundaries
> * commit/rollback ordering
> * idempotency behavior
> * concurrency behavior
> * error propagation
>
> ## Frozen Behavioral Baseline — MUST NOT CHANGE
>
> Do not change:
>
> * API endpoint paths/methods
> * request headers
> * request JSON contracts
> * response JSON contracts
> * HTTP statuses
> * validation semantics
> * error codes/messages/mapping
> * OpenAPI/Swagger consumer-visible behavior
> * business rules
> * Sale lifecycle/state behavior
> * expiry behavior
> * database schema
> * migrations
> * seed data
> * SQL statements or SQL semantics
> * repository return/null semantics
> * transaction boundaries
> * transaction duration in a behaviorally meaningful way
> * commit/rollback behavior
> * locking strategy/order
> * advisory locks
> * Sale row locks
> * idempotency algorithm/fingerprint
> * replay/conflict/FAILED behavior
> * concurrency outcomes
> * Docker/runtime behavior
>
> Do not add dependencies unless absolutely required.
>
> Do not weaken, delete, skip, or rewrite existing tests merely to make the architectural change pass.
>
> If the proposed refactor requires changing any Frozen Behavioral Baseline behavior:
>
> **STOP and report the required behavioral change for explicit approval. Do not implement it.**
>
> ## Scope control
>
> Implement **T-014 only**.
>
> Do not perform unrelated:
>
> * service refactoring
> * DTO refactoring
> * validation refactoring
> * folder restructuring
> * naming cleanup
> * SQL cleanup
> * ORM introduction
> * dependency upgrades
> * framework changes
> * generic architecture cleanup
>
> Do not revisit completed T-011–T-013 unless a regression directly caused by T-014 requires a narrowly scoped fix.
>
> ## Baseline verification
>
> Before modifying production code, run the existing gates in this order:
>
> 1. typecheck
> 2. lint
> 3. build
> 4. existing tests/regression tests
>
> Record actual results.
>
> If the baseline is failing before T-014:
>
> **STOP and report the baseline failure before modifying production code.**
>
> ## Verification after review/refactor
>
> If production code changes, run in this order:
>
> 1. typecheck
> 2. lint
> 3. build
> 4. existing tests/regression tests
>
> Then run relevant:
>
> * complete unit suite
> * repository/data-access tests
> * Create Sale integration tests
> * Payment integration tests
> * Cancel integration tests
> * idempotency/replay/conflict tests
> * rollback/failure-injection tests
> * transaction tests
> * advisory-lock tests
> * Sale row-lock tests
> * concurrency tests
> * API/OpenAPI regression
> * isolated Docker/MySQL full integration gate
> * `git diff --check`
>
> If the result is **no production-code change**, still run sufficient static/regression/full-integration gates to demonstrate that the reviewed baseline remains valid.
>
> ## Repository-specific regression review
>
> Explicitly verify that:
>
> * Product lookup behavior is unchanged
> * Sale create/read/update behavior is unchanged
> * Sale not-found/null behavior is unchanged
> * Sale row-lock behavior is unchanged
> * Payment persistence and uniqueness behavior is unchanged
> * idempotency record lookup/write behavior is unchanged
> * FAILED idempotency persistence remains unchanged
> * transaction-scoped repository calls continue using the correct connection
> * no repository call accidentally falls back to the global pool inside an active transaction
> * SQL statements and parameters remain unchanged
> * database constraints remain unchanged
>
> If interfaces/ports are introduced, verify that application tests can substitute them without exposing MySQL/Knex implementation details unnecessarily.
>
> ## Final Regression Gate after T-014
>
> Because T-014 completes the T-011–T-014 refactor sequence, perform the checklist's **Final Regression Gate after T-014**.
>
> Explicitly verify and record:
>
> * Typecheck
> * Lint
> * Build
> * Unit tests
> * Integration tests
> * Docker/MySQL integration where applicable
> * API contract regression for all existing endpoints
> * Validation/error regression
> * Idempotency regression
> * Concurrency regression
> * Runtime API ↔ OpenAPI/Swagger ↔ README consistency
> * confirmation that T-001–T-010 behavior remains unchanged
>
> This final regression gate is required even if T-014 results in no production-code change.
>
> ## Final diff review
>
> Inspect the complete T-014 diff.
>
> Confirm:
>
> * every production-code change has concrete justification
> * no SQL behavior changed
> * no repository return/null semantics changed
> * no transaction/locking/idempotency/concurrency behavior changed
> * no unnecessary interface/port was introduced
> * no existing tests were weakened
> * no unrelated refactor occurred
> * documentation/audit/checklist accurately reflect actual work
>
> Run:
>
> `git diff --check`
>
> ## Prompt audit
>
> Follow AUD01.
>
> Create/update the T-014 prompt audit file under `docs/prompts/` following the existing repository convention.
>
> Store this Prompt #1 **verbatim**.
>
> Record:
>
> * dependency inventory
> * current dependency-direction assessment
> * testability assessment
> * concrete findings
> * interface/port decision for each relevant dependency
> * refactor/no-refactor justification
> * files changed
> * baseline gate results
> * implementation details, if any
> * post-review/refactor results
> * Final Regression Gate results
> * remaining findings/risks
> * current T-014 status
>
> Do not mark T-014 `DONE` yet.
>
> After review/refactor and required verification:
>
> * update `docs/IMPLEMENTATION_CHECKLIST.md` with factual evidence
> * move T-014 only to the appropriate review state
> * leave it ready for an independent Senior Review / Final Gate
>
> ## Expected final response
>
> Report:
>
> 1. Repository dependency inventory
> 2. Dependency-direction assessment
> 3. Testability assessment
> 4. Concrete problems found
> 5. Interface/port decision for each relevant dependency
> 6. Whether production code changed
> 7. Exact justification for each introduced abstraction, if any
> 8. Files changed
> 9. SQL behavior comparison
> 10. Repository return/null semantics comparison
> 11. Transaction/connection propagation assessment
> 12. Locking/idempotency/concurrency assessment
> 13. Baseline gate results
> 14. Post-review/refactor test results
> 15. Final Regression Gate results
> 16. Docker/MySQL result/count
> 17. API/OpenAPI/README consistency result
> 18. `git diff --check` result
> 19. Prompt-audit/checklist updates
> 20. Remaining risks/findings
> 21. Final T-014 status
>
> Do **not** claim `DONE` until an independent Senior Review / Final Gate has passed.

## Dependency inventory

All application-layer repository dependencies are confined to the three workflow services. `src/application/idempotency-key-lock.ts` depends directly on Knex for the existing advisory-lock mechanism but is not a repository/data-access implementation and was reviewed as part of the transaction/connection boundary.

| Consumer | Concrete dependency | Methods used and contract | Connection / lock semantics | Current tests and wiring |
| --- | --- | --- | --- | --- |
| Create Sale | `SaleRepository` | `findAvailableProduct(Transaction, string) → ProductForSale \| undefined`; `insert(Transaction, NewSaleRecord) → void`; replay uses `findByIdForUpdate(Transaction, string) → LockedSale \| undefined`, `markCancelled(Transaction, string) → void`, and `findView(Transaction, string) → SaleView \| undefined` | Every call receives the active transaction. Replay takes the Sale row lock with `SELECT ... FOR UPDATE`; read/update remain on that transaction and its pinned advisory-lock connection. | Constructor option can supply a structurally compatible repository; defaults instantiate `SaleRepository`. Behavior-critical integration tests use real MySQL. Production composition constructs only the service in `src/server.ts`; repository defaults are explicit inside the service. |
| Create Sale | `IdempotencyRepository` | `insertProcessing(Transaction, key, fingerprint[, operation]) → void`; `markSucceeded(Transaction, key, saleId) → void`; `find(Knex, key) → IdempotencyRecord \| undefined`; `insertFailed(Transaction, key, fingerprint[, operation]) → void` | Processing/success writes use the business transaction. `find` occurs only after duplicate-entry rollback. `insertFailed` uses a new transaction pinned to the same advisory-lock connection after business rollback. No row lock is implemented here; the unique key and advisory lock serialize the key. | Same constructor/default mechanism. Real database is required by current integration coverage for atomicity, unique-key behavior, rollback, and replay. |
| Payment | `SaleRepository` | `findByIdForUpdate(Transaction, saleId) → LockedSale \| undefined`; `markCancelled(Transaction, saleId) → void`; `insertPayment(Transaction, NewPaymentRecord) → void`; `markPaid(Transaction, saleId) → void`; replay uses `findPaymentView(Knex, paymentId) → PaymentView \| undefined` | Sale lookup takes `SELECT ... FOR UPDATE`. All create/update calls use the active transaction pinned to the advisory-lock connection. Replay payment lookup uses the global pool only after the business transaction is complete and while no transaction is active. | Same constructor/default mechanism. Real MySQL integration tests cover payment uniqueness, expiry recheck, transaction rollback, Sale locks, and competing operations. |
| Payment | `IdempotencyRepository` | `insertProcessing(Transaction, key, fingerprint, PAYMENT) → void`; expiry uses `markSucceeded(Transaction, key, saleId) → void`; normal payment uses `markPaymentSucceeded(Transaction, key, paymentId) → void`; replay uses `find(Knex, key) → IdempotencyRecord \| undefined`; failure uses `insertFailed(Transaction, key, fingerprint, PAYMENT) → void` | Writes use the correct business or separate post-rollback transaction. Duplicate-key lookup is a post-rollback global-pool read. Advisory lock remains held across workflow and separate failure persistence. | Same constructor/default mechanism and real-database coverage as above. |
| Cancel | `SaleRepository` | `findByIdForUpdate(Transaction, saleId) → LockedSale \| undefined`; conditional `markCancelled(Transaction, saleId) → void` | Both calls use the active transaction pinned to the advisory-lock connection. Lookup takes `SELECT ... FOR UPDATE`. An already-cancelled Sale is returned without another update. | Same constructor/default mechanism. Real MySQL tests cover pending, expired, already-cancelled, paid, Payment/Cancel races, and same-key serialization. |
| Cancel | `IdempotencyRepository` | `insertProcessing(Transaction, key, fingerprint, CANCEL) → void`; `markSucceeded(Transaction, key, saleId) → void`; replay uses `find(Knex, key) → IdempotencyRecord \| undefined`; failure uses `insertFailed(Transaction, key, fingerprint, CANCEL) → void` | Success writes are atomic with cancellation. Duplicate-key lookup is post-rollback; failed persistence is a separate transaction pinned to the held advisory-lock connection. | Same constructor/default mechanism and real-database integration coverage. |

### Null / not-found and update semantics

- Product, Sale, Payment, and idempotency lookups return `undefined` when no row exists; they do not return `null` or throw merely for absence.
- Nullable database resource fields inside `IdempotencyRecord` remain `string | null` and drive replay resolution.
- `markPaid`, `markCancelled`, `markSucceeded`, and `markPaymentSucceeded` require exactly one affected row and throw otherwise.
- Inserts return `void` and propagate database errors, including duplicate and integrity errors.

## Dependency-direction assessment

- The application services import and instantiate concrete database repository classes, so the compile-time direction is application → database repository.
- The repository methods nevertheless expose domain/application-oriented records plus explicit Knex connection/transaction handles. Application services do not contain SQL, table or column names, query-builder chains, row mapping, or MySQL result shapes.
- There is one implementation of each repository, no alternate implementation requirement, and no observed change hotspot caused by the concrete class names.
- Explicit transaction orchestration belongs to the services under the approved baseline. The Knex transaction parameter is behaviorally important because it proves which calls participate in each atomic unit and which reads intentionally occur afterward.

## Testability assessment

- Service constructors already accept repository objects through options. Because the repository classes have no private/protected nominal members, TypeScript structural typing permits a substitute that implements the required public shape.
- A substitute currently has to satisfy the concrete class's full public shape rather than a narrow per-consumer contract. That is a theoretical inconvenience, but no current test needs such a substitute and no production defect or test blockage results from it.
- Full service behavior still depends directly on `Knex.transaction` and `withIdempotencyKeyLock`, including a dedicated pinned connection, MySQL advisory locks, Sale row locks, unique constraints, rollback timing, and concurrency. Adding repository interfaces alone would not make these workflows database-independent or materially simplify the tests.
- Current unit tests isolate HTTP executors, DTO mappings, business predicates/calculation, fingerprints, and advisory-lock resource ordering. Current integration tests intentionally use real repositories/MySQL for workflow behavior. This split is appropriate for the observable risks.

## Concrete findings and interface/port decisions

### F-01 — `SaleRepository`: no port introduced

No concrete maintainability or testability failure was found. A consumer-driven interface would mostly repeat the existing methods and still require `Knex.Transaction`, leaking the same infrastructure type while adding another synchronization point. It would not remove the need for real-database transaction, locking, constraint, expiry, or concurrency tests. Decision: retain the concrete dependency.

### F-02 — `IdempotencyRepository`: no port introduced

Its behavior is inseparable from the workflow transaction, unique key, resource foreign keys, separate failed transaction, and advisory-lock lifetime. An interface with the same Knex signatures would be a mechanical copy, while a genuinely infrastructure-free idempotency port would require redesigning transaction ownership and lock coordination beyond the demonstrated need and T-014 scope. Decision: retain the concrete dependency.

### F-03 — Knex transaction/database and advisory-lock helper: no new abstraction

These are the actual reasons complete service tests use MySQL. Abstracting only repositories would leave them intact; abstracting all of them would introduce a transaction/unit-of-work and distributed lock boundary with substantial indirection and behavioral risk. Existing direct helper unit tests plus isolated MySQL integration tests already provide targeted coverage. Decision: no transaction, unit-of-work, connection, or lock port.

### F-04 — Composition remains explicit

`src/server.ts` explicitly creates one shared Knex database and the three services. Each service constructs stateless repositories by default and permits option injection. No dependency-injection framework or service locator is needed.

## Production-code decision

No production code changed. No proposed interface/port met the required evidence threshold. This avoids a premature abstraction that would preserve the same Knex coupling, duplicate concrete method signatures, and not improve the behavior-critical test boundary.

## Files changed

- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/README.md`
- `docs/prompts/T-014-repository-dependency-boundary.md`

## Baseline gates

Executed before any modification, in required order:

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm test`: PASS — 90 passed, 58 database-context tests skipped as designed.

## Repository-specific regression assessment

- Product availability lookup, Sale insert/view/update behavior, Payment insert/view behavior, and all `undefined` not-found semantics are unchanged because repository and service sources are unchanged.
- SQL statements, selected columns, predicates, parameters, result mapping, and query ordering are unchanged.
- Sale row locking remains `.forUpdate()` before all Payment/Cancel state decisions and before Create Sale replay expiry mutation.
- Every repository call made inside a transaction receives that transaction. No call falls back to the global pool inside an active transaction.
- Global-pool calls are intentional and occur only outside a transaction: idempotency lookup after a duplicate-key transaction failure and Payment lookup during replay after the original transaction has completed.
- Successful business and idempotency writes remain atomic. `FAILED` records remain in a separate post-rollback transaction pinned to the held advisory-lock connection.
- Advisory lock → Sale row lock ordering, fingerprinting, replay/conflict/failed behavior, unique constraints, one-Payment guard, expiry checks, and concurrency outcomes are unchanged.

## Post-review and Final Regression Gate results

- Final ordered host gates after the audit/checklist update: typecheck PASS; lint PASS; build PASS; host regression PASS — 90 passed and 58 database-context tests skipped as designed.
- Complete unit suite: PASS — 61/61.
- Isolated Docker/MySQL full gate: PASS — 148/148 across 17 test files.
- Create Sale integration: 13/13; Payment integration: 18/18; Cancel integration: 13/13; database schema/integrity: 10/10; validation/error integration: 18/18.
- The full gate also passed product seed, HTTP foundation, all unit/API/OpenAPI tests, idempotency replay/conflict/FAILED paths, rollback/failure injection, advisory locks, Sale row locks, expiry races, same-key serialization, different-key Payment competition, and Payment/Cancel concurrency.
- Docker configuration, build, readiness recovery, service-name networking, migration, repeatable seed, and volume persistence passed. All disposable containers, image, network, and volume were removed.
- The first sandboxed Docker run was blocked by permission to the user's Docker configuration/engine; the approved rerun passed. This was an execution-environment restriction, not a repository failure.
- Runtime routes, `docs/API.md`, `src/http/openapi.ts`, OpenAPI tests, and README's three-endpoint/architecture description are consistent. The pre-existing Cancel JSON `null` documentation/runtime note recorded under T-012 remains unchanged and outside T-014 scope.
- T-001–T-010 behavior remains unchanged: no production, test, schema, migration, seed, dependency, Docker, or runtime file changed.
- `git diff --check`: PASS with expected Windows line-ending warnings only; a separate no-index whitespace check of the new untracked audit file reported no whitespace errors.

## Remaining risks / findings

- The services remain compile-time coupled to concrete repository classes and Knex. This is an acknowledged simple dependency, not a demonstrated defect. Revisit only if a second repository implementation, a genuine database-independent service-test requirement, or recurring change friction emerges.
- The existing constructor seam is broader than a consumer-specific fake would ideally be. No current test or delivery need justifies adding interfaces solely to narrow it.
- The pre-existing Cancel JSON `null` documentation/runtime inconsistency from T-012 remains outside T-014 scope.
- Independent Senior Review / Final Gate has not yet occurred.

## Additional / follow-up prompts

### Prompt #2 — 2026-09-18

> Perform an **independent Senior Review / Final Gate for T-014 — Review Repository Dependency Boundary**.
>
> T-014 currently reports a **no-production-code-change** decision because no repository interface/port met the evidence threshold.
>
> Do NOT assume that decision is correct merely because tests passed.
>
> This is also the **Final Regression Gate for the complete T-011–T-014 refactor sequence**.
>
> Before reviewing, read and follow:
>
> * `AGENTS.md` and applicable nested instructions
> * `docs/IMPLEMENTATION_CHECKLIST.md`
> * `docs/API.md`
> * `README.md`
> * `docs/prompts/README.md`
> * `docs/prompts/T-014-repository-dependency-boundary.md`
> * completed T-011, T-012, and T-013 audits
> * application services
> * concrete repositories/data-access implementations
> * transaction/connection infrastructure
> * idempotency and advisory-lock implementation
> * composition/wiring
> * relevant unit/integration/database/concurrency tests
>
> Treat **T-001–T-010 as the Frozen Behavioral Baseline**.
>
> ## 1. Independently re-evaluate the no-abstraction decision
>
> Do not treat "no code change" as automatically correct.
>
> Inventory the application-layer dependencies on:
>
> * `SaleRepository`
> * `IdempotencyRepository`
> * transaction/connection infrastructure
> * any other concrete database/data-access dependency
>
> For each dependency determine:
>
> * what application code consumes it
> * methods actually required
> * whether MySQL/Knex-specific details leak into application business logic
> * whether consumers depend on infrastructure-specific types
> * whether unit testing is materially constrained by the concrete dependency
> * whether current constructor substitution / TypeScript structural typing already provides sufficient testability
> * whether an interface/port would establish a meaningful dependency boundary
> * whether it would merely mirror the existing concrete class API
>
> Explicitly determine whether the no-interface decision is justified.
>
> Do not recommend an interface merely because DIP, SOLID, Clean Architecture, Hexagonal Architecture, or another pattern commonly uses interfaces.
>
> ## 2. Verify application/infrastructure boundary
>
> Confirm application services do NOT contain inappropriate infrastructure knowledge such as:
>
> * SQL strings
> * table names
> * column names
> * query-builder construction
> * database-row mapping
> * schema-specific persistence logic
>
> Assess any Knex transaction/connection types crossing the boundary.
>
> Determine whether those types represent a concrete current architectural/testability problem or whether abstracting them would require a much broader transaction/unit-of-work/locking abstraction with little current benefit.
>
> Do not introduce such an abstraction unless there is concrete evidence that T-014 requires it.
>
> ## 3. Repository semantic review
>
> Independently verify current behavior for:
>
> ### SaleRepository
>
> * Product lookup
> * Sale creation
> * Sale lookup
> * replay-time Sale lookup/locking
> * Sale row locking
> * expiry cancellation
> * `PENDING → PAID`
> * `PENDING → CANCELLED`
> * Payment creation/read behavior
> * affected-row expectations
> * not-found behavior
>
> ### IdempotencyRepository
>
> * duplicate-key lookup
> * processing persistence
> * success persistence
> * FAILED persistence
> * replay lookup
> * resource identifier nullability
> * request identity/fingerprint storage behavior
>
> Confirm return/null semantics remain exactly as before, including `undefined` vs `null` where applicable.
>
> ## 4. Transaction and connection propagation
>
> Trace the major workflows end-to-end:
>
> * Create Sale
> * Payment
> * Cancel
>
> Verify every repository operation that must participate in a transaction receives the correct transaction/pinned connection.
>
> Explicitly look for accidental global-pool calls inside an active transaction.
>
> Verify any intentional global-pool read happens only at the appropriate point outside the relevant transaction.
>
> Confirm unchanged:
>
> * transaction boundaries
> * commit/rollback ordering
> * connection lifetime
> * pinned connection behavior
> * advisory-lock ordering
> * Sale row-lock timing/order
> * `SELECT ... FOR UPDATE`
> * separate FAILED persistence
>
> ## 5. Frozen Behavioral Baseline
>
> Verify T-014 and the complete T-011–T-014 sequence did NOT change approved T-001–T-010 behavior:
>
> * endpoint paths/methods
> * request headers
> * request JSON contracts
> * response JSON contracts
> * status codes
> * validation behavior
> * error codes/messages/mapping
> * OpenAPI/Swagger consumer-visible contract
> * business rules
> * Sale lifecycle
> * expiry behavior
> * schema/migrations/seed
> * SQL semantics
> * transaction behavior
> * locking behavior
> * idempotency algorithm/fingerprint
> * replay/conflict behavior
> * FAILED persistence
> * concurrency behavior
> * Docker/runtime behavior
>
> ## 6. Test integrity
>
> Review the T-014 diff and relevant T-011–T-014 test history.
>
> Verify no test or assertion was:
>
> * removed
> * weakened
> * skipped
> * relaxed
> * modified merely to accept changed behavior
>
> Confirm test coverage still meaningfully protects:
>
> * repository semantics
> * DB constraints
> * transactions
> * rollback
> * idempotency
> * advisory locks
> * Sale row locks
> * concurrency
> * validation/errors
> * API contracts
>
> ## 7. Final Regression Gate — T-011 through T-014
>
> Run fresh gates independently.
>
> Run in this order:
>
> 1. typecheck
> 2. lint
> 3. build
> 4. host regression tests
>
> Then run and record:
>
> * complete unit suite
> * integration suite
> * database/schema/integrity tests
> * Create Sale tests
> * Payment tests
> * Cancel tests
> * validation/error regression
> * API contract regression
> * OpenAPI/Swagger regression
> * idempotency/replay/conflict regression
> * FAILED persistence/rollback regression
> * advisory-lock regression
> * Sale row-lock regression
> * expiry regression
> * concurrency/cross-workflow regression
> * isolated Docker/MySQL full gate
> * readiness/networking/migration/seed/persistence checks
> * `git diff --check`
>
> Do not rely solely on Prompt #1 recorded results.
>
> ## 8. Runtime documentation consistency
>
> Independently compare:
>
> **runtime routes ↔ OpenAPI/Swagger ↔ `docs/API.md` ↔ README**
>
> Confirm consumer-visible behavior remains consistent.
>
> The pre-existing Cancel JSON `null` documentation/runtime discrepancy recorded previously is outside T-014 unless T-014 introduced or modified it.
>
> Do not silently change that contract as part of this review.
>
> ## 9. Findings
>
> Classify findings as:
>
> * BLOCKER
> * MAJOR
> * MINOR
> * NOTE
>
> For each finding report:
>
> * file/location
> * concrete problem
> * impact
> * whether it violates T-014 or the Frozen Behavioral Baseline
> * required fix
>
> If a BLOCKER, MAJOR, or behavior-affecting finding exists:
>
> 1. Do not mark T-014 DONE.
> 2. Fix only findings clearly within T-014 scope.
> 3. Re-run affected tests.
> 4. Re-run the complete Final Regression Gate.
> 5. Record the finding/fix/results in the audit.
>
> If fixing a finding requires changing approved T-001–T-010 behavior:
>
> **STOP and report it for explicit approval. Do not make the behavioral change automatically.**
>
> ## 10. Final architectural decision
>
> Explicitly state one of:
>
> **A. NO INTERFACE/PORT JUSTIFIED**
>
> or
>
> **B. INTERFACE/PORT JUSTIFIED**
>
> If A:
>
> Explain why the current concrete dependencies provide sufficient clarity/testability and why additional abstraction would currently add more indirection than value.
>
> No production architecture change is required.
>
> If B:
>
> Do not implement it automatically unless it is clearly within T-014 and preserves the Frozen Behavioral Baseline.
>
> Document the exact concrete problem and minimal proposed abstraction.
>
> ## 11. Prompt audit and checklist
>
> Follow AUD01.
>
> Append this Prompt #2 **verbatim** to:
>
> `docs/prompts/T-014-repository-dependency-boundary.md`
>
> Preserve Prompt #1 verbatim.
>
> Record:
>
> * independent dependency review
> * architectural decision
> * findings
> * fixes, if any
> * repository semantic assessment
> * transaction/connection assessment
> * test-integrity assessment
> * complete Final Regression Gate results
> * runtime/OpenAPI/docs consistency result
> * final decision
>
> T-014 may be marked `DONE` only when:
>
> * T-014 Acceptance Criteria pass
> * SRG01 passes
> * no unresolved BLOCKER/MAJOR/MINOR findings remain
> * repository semantics remain unchanged
> * transaction/locking/idempotency/concurrency remain unchanged
> * Frozen Behavioral Baseline is preserved
> * complete Final Regression Gate passes
> * prompt audit is complete
>
> If all conditions pass:
>
> * update `docs/IMPLEMENTATION_CHECKLIST.md`
> * mark T-014 `DONE`
> * mark completed T-014 sub-tasks and Acceptance Criteria
> * add factual Senior Review / Final Gate evidence
> * record completion of the **Final Regression Gate after T-014**
>
> ## Expected final response
>
> Report:
>
> 1. Final Gate result
> 2. Findings by severity
> 3. Final architectural decision: A or B
> 4. Dependency-direction assessment
> 5. Testability assessment
> 6. SaleRepository assessment
> 7. IdempotencyRepository assessment
> 8. Transaction/connection propagation assessment
> 9. SQL/repository semantic comparison
> 10. Frozen Behavioral Baseline result
> 11. Test-integrity result
> 12. Typecheck/lint/build results
> 13. Host regression result/count
> 14. Unit result/count
> 15. Integration/API/validation results
> 16. Idempotency/rollback/locking/concurrency results
> 17. Docker/MySQL full-gate result/count
> 18. Runtime ↔ OpenAPI ↔ docs consistency result
> 19. `git diff --check` result
> 20. Fixes made, if any
> 21. Prompt-audit/checklist updates
> 22. Final Regression Gate result for T-011–T-014
> 23. Final T-014 status: `DONE` or not, with reason

## Independent Senior Review / Final Gate — 2026-09-18

### Final result and architectural decision

- Final Gate: PASS.
- Architectural decision: **A. NO INTERFACE/PORT JUSTIFIED**.
- No production architecture change is required. The current concrete repository dependencies are explicit and small; adding ports would copy Knex-bearing method signatures without isolating services from transactions, the pinned advisory-lock connection, row locks, or database constraints.

### Independent dependency and testability review

- `CreateSaleService`, `PaymentService`, and `CancelSaleService` consume `SaleRepository` and `IdempotencyRepository`. Required methods match the Prompt #1 inventory; no unrecorded repository/data-access dependency was found.
- Application service business logic contains no SQL strings, table/column names, query-builder construction, database-row mapping, or schema-specific persistence logic.
- Services do depend on the `Knex` type and explicitly orchestrate transaction callbacks. Repository methods take `Knex.Transaction` or `Knex | Knex.Transaction`. This is infrastructure coupling, but it is currently meaningful because each call site makes transaction participation visible and preserves the approved service-owned transaction boundary.
- Constructor options and TypeScript structural typing provide an existing repository substitution seam. It requires the concrete public shape rather than a narrow consumer contract, but no current test, defect, or maintenance change is blocked by that breadth.
- Full workflow tests necessarily exercise MySQL transaction, advisory-lock, row-lock, constraint, rollback, and concurrency behavior. Repository interfaces alone would not make those tests database-independent. A useful abstraction would require a larger transaction/unit-of-work and lock boundary, for which no concrete need exists.
- `src/application/idempotency-key-lock.ts` contains the MySQL-specific `GET_LOCK`/`RELEASE_LOCK` SQL and Knex pool-client handling. This is a narrow infrastructure detail extracted by T-013, not business logic in a service. It has four direct lifecycle/error-order tests and full MySQL concurrency coverage. A port is not justified until an alternate database/lock implementation or a demonstrated isolated workflow-test need exists.

### Repository semantic assessment

- `SaleRepository` preserves available/non-deleted Product lookup, Sale insert and joined view mapping, replay-time and action-time `.forUpdate()` Sale lookup, pending-only paid/cancelled updates, Payment insert/read mapping, and exact-one-row expectations for state changes.
- Product, Sale, and Payment lookup absence remains `undefined`. Nullable Payment change and idempotency resource identifiers remain `null` where defined by persisted schema semantics.
- `IdempotencyRepository` preserves processing, Sale success, Payment success, lookup, and failed inserts; request fingerprint and operation type storage are unchanged. Success updates still require one processing row. `find` still returns `undefined` for no row while `saleId` and `paymentId` remain `string | null` on an existing row.
- SQL text, parameters, predicates, selected columns, mappings, query ordering, schema, migrations, seed, and constraints are unchanged by T-014.

### Transaction / connection / locking assessment

- Create Sale: processing insert, Product lookup, Sale insert, and success update share the business transaction pinned to the advisory-lock connection. Replay uses a new pinned transaction for Sale row lock, optional expiry cancellation, and current Sale view. Failed persistence runs only after rollback in a separate pinned transaction.
- Payment: processing insert, Sale row lock, state/expiry checks, Payment insert, Sale update, and success update share the pinned business transaction. Expired cancellation and success are atomic. Failed persistence is separate after rollback. Payment replay lookup uses the global pool only when no transaction is active.
- Cancel: processing insert, Sale row lock, optional cancellation, and success update share the pinned business transaction. Failed persistence is separate after rollback.
- Duplicate-key idempotency reads use the global pool only after the attempted business transaction has failed and rolled back. No repository call falls back to the global pool inside an active transaction.
- Advisory lock acquisition remains before Sale row locks; the same acquired connection pins workflow transactions; `SELECT ... FOR UPDATE`, lock timing, commit/rollback order, connection cleanup, and separate `FAILED` persistence are unchanged.

### Test-integrity review

- T-014 changes documentation only; no production or test file changed.
- T-011 test changes replaced moved response types and adjusted service fixtures from serialized HTTP shapes to domain/application views while retaining the same response/status/field assertions. No assertion was removed or weakened.
- T-012 changed no tests.
- T-013 added four focused advisory-lock lifecycle/error tests; no existing test was changed or removed.
- Existing coverage continues to protect repository semantics, constraints, atomic transactions, rollback/failure injection, idempotency/replay/conflict/FAILED behavior, advisory locks, Sale row locks, expiry, cross-workflow concurrency, validation/errors, response contracts, and OpenAPI.

### Findings

- BLOCKER: none.
- MAJOR: none.
- MINOR: none.
- NOTE `T014-SR-001` — `src/application/idempotency-key-lock.ts`: the shared helper deliberately contains MySQL advisory-lock SQL and Knex internal connection handling. Impact: the lock mechanism is tied to MySQL/Knex. This does not violate T-014 or the Frozen Behavioral Baseline, and current direct/integration coverage is strong. Required fix: none; revisit only when a real alternate implementation or isolated workflow-test requirement appears.
- NOTE `T014-SR-002` — `docs/API.md` versus Cancel JSON `null` runtime behavior: the pre-existing documentation/runtime discrepancy recorded by T-012 remains. T-014 neither introduced nor modified it. Required fix: none within T-014; any contract choice requires separate authorization.

### Independent Final Regression Gate

- Ordered gates: typecheck PASS; lint PASS; build PASS; host regression PASS — 90 passed, 58 guarded database-context skips.
- Complete unit suite: PASS — 61/61.
- Focused Create Sale, Payment, Cancel HTTP and OpenAPI suite: PASS — 38/38; OpenAPI 2/2 within that suite.
- Isolated Docker/MySQL full gate: PASS — 148/148 across 17 files.
- Docker integration counts: Create Sale 13/13; Payment 18/18; Cancel 13/13; database schema/integrity 10/10; validation/error 18/18; product seed 4/4; HTTP foundation 11/11.
- The Docker gate also passed API contracts, idempotency replay/conflict, separate `FAILED` persistence, rollback/failure injection, advisory-lock behavior, Sale row locking, two-point expiry checks, same-key serialization, different-key Payment competition, and Payment/Cancel cross-workflow concurrency.
- Docker configuration/build, readiness recovery, health, service-name networking, migration, repeatable seed, and named-volume persistence passed. All disposable containers, image, network, and volume were removed.
- Runtime routes, OpenAPI/Swagger, `docs/API.md`, and README are consistent for the three consumer-visible endpoints, subject only to the unchanged pre-existing Cancel JSON `null` note.
- Frozen Behavioral Baseline PASS: T-011–T-014 did not change approved endpoint, request/response, status, validation, error, business/state, expiry, schema, SQL, transaction, locking, idempotency, replay/conflict/FAILED, concurrency, or Docker/runtime behavior.
- `git diff --check`: PASS with expected Windows line-ending warnings only; the new audit file also has no whitespace errors.

### Fixes made

None. No production or test defect was found. Only the prompt audit and checklist were updated with independent review evidence.

## Current Task status

DONE — all T-014 acceptance criteria, independent SRG01 review, AUD01, and the complete Final Regression Gate for T-011–T-014 pass with no unresolved BLOCKER, MAJOR, or MINOR findings.
