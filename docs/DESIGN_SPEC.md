# Backend Design Specification

## 1. Purpose
This document describes the technical design used to satisfy `docs/SRS.md` for the backend service. The API contract in `docs/API.md` remains the source for exact public request/response examples.

## 2. Architecture Overview

```text
Client
  |
  v
Express Route
  |
  v
Controller / HTTP boundary
  |  DTO + strict validation + error mapping
  v
Application Service / Use Case
  |  business rules + idempotency + transaction orchestration
  v
Repository / Data Access
  |
  v
MySQL 8.x
```

The intended dependency direction is Route → Controller → Service/Use Case → Repository/Data Access → MySQL. HTTP concerns stay out of domain/business logic and persistence concerns stay behind the data-access boundary.

## 3. Project Structure

The implementation is organized around these responsibilities:

- `src/http/routes`: route registration.
- `src/http/controllers`: HTTP request/response handling.
- `src/http/dtos`: request/response boundary models.
- `src/http/validation`: strict boundary validation.
- `src/application/services`: Create Sale, Payment, and Cancel orchestration.
- `src/application/errors`: application/public error definitions.
- `src/domain`: core Sale and Payment domain concepts.
- `src/database`: schema/migration/seed and database concerns.
- `src/infrastructure`: concrete infrastructure/data-access implementations.
- `src/config`: environment/configuration handling.
- `src/openapi.ts`: OpenAPI/Swagger definition.
- `tests/unit`, `tests/integration`, `tests/environment`, `tests/support`: executable verification.

## 4. HTTP and API Design

The public API exposes exactly three POST action routes under `/api/v1`:

| Operation | Endpoint | Controller responsibility |
| --- | --- | --- |
| Create Sale | `POST /sales` | Validate key/body, invoke Create Sale service, map first/replay result. |
| Payment | `POST /sales/:sale_id/payment` | Validate key/path/body, invoke Payment service, map payment/expired/conflict result. |
| Cancel | `POST /sales/:sale_id/cancel` | Validate key/path/no-body contract, invoke Cancel service, map cancelled/conflict result. |

Controllers remain thin. Strict DTO/boundary validation rejects unknown or malformed input before business orchestration.

## 5. Domain and State Design

Sale state is constrained to:

```text
PENDING ──payment──> PAID
   |
   ├──cancel───────> CANCELLED
   |
   └──expiry───────> CANCELLED
```

There is no virtual/background expiration state. Expiration is persisted when a relevant action observes an expired `PENDING` Sale.

A Sale represents exactly one Product unit and stores a price snapshot. Payment supports `CASH` and `QR_PAYMENT`. A database uniqueness constraint on Payment → Sale provides the final one-payment-per-sale integrity guard.

## 6. Transaction and Concurrency Design

Create Sale commits the Sale and successful idempotency state atomically.

Payment performs the critical flow inside a short transaction: acquire/lock the Sale, validate current state and expiration, validate payment rules, create Payment, transition Sale to `PAID`, record successful idempotency state, recheck required expiry condition, and commit. Concurrency protection combines row locking with the unique Payment Sale constraint.

Cancel validates and transitions the Sale atomically with successful idempotency persistence. Expired `PENDING` Sales are persisted as `CANCELLED`.

Business failure rolls back the business transaction first. A terminal `FAILED` idempotency record is then persisted using a separate transaction so failed operations cannot leave partial business writes while the key remains terminal.

## 7. Idempotency Design

Every operation requires a client-generated `Idempotency-Key`. The key namespace is global across all three operations. The application derives a deterministic fingerprint from the operation and logical request fields.

Behavior:

- Same key + same successful logical request: return the associated existing result without executing the operation again.
- Same key + different logical request/operation: `409 IDEMPOTENCY_CONFLICT`.
- Key associated with a failed business operation: `409 IDEMPOTENCY_FAILED`.
- Concurrent same-key requests are serialized so waiters observe the committed terminal state.

The design stores the fingerprint and resource identifiers rather than a complete serialized HTTP response body.

## 8. Database Design

Core persisted concepts are Product, Sale, Payment, and idempotency records.

```text
Product 1 ─────< Sale 1 ───── 0..1 Payment
                    |
                    +── associated idempotency resource state
```

Important database guarantees include unique Product code, unique Payment Sale reference, unique idempotency key, foreign-key integrity, Sale quantity constrained to one, valid status/payment enums, integer THB monetary fields, and `deleted_at` only on Product.

Schema evolution is migration-based. Product seed is deterministic and contains exactly `P001`–`P005` with relative image paths.

## 9. Validation and Error Design

Validation is performed at the HTTP boundary without implicit coercion. Public failures use one error envelope and a fixed code catalog. Application/business errors are mapped explicitly to HTTP status/code/message. Unexpected exceptions fall through a sanitized global `500 INTERNAL_SERVER_ERROR` response.

Internal stack traces, SQL/database details, credentials, and environment values are never exposed through public HTTP errors.

## 10. Configuration and Runtime Design

Docker Compose contains two runtime services: `backend` and `mysql`. MySQL uses version 8.x and persistent volume storage. The backend receives database host, port, user, password, and database name from environment variables; inside Compose the database host is `mysql`.

MySQL health/readiness gates backend database operations. Migration, seed, and test commands are designed to run from the backend container. `.env.example`, `.gitignore`, and `.dockerignore` define the safe configuration/development boundary.

## 11. Logging and Security

The backend uses structured operational logging while excluding passwords, secrets, raw credentials, and sensitive environment data. Reasonable Express HTTP security defaults are applied. Authentication and authorization are intentionally not introduced because they are outside the approved scope.

## 12. OpenAPI and Documentation

`src/openapi.ts` provides the Swagger/OpenAPI representation. `docs/API.md` is the human-readable API contract. Both should remain aligned with the implemented routes, status codes, DTOs, and public error catalog.

## 13. Verification Strategy

Unit tests verify HTTP mapping and isolated business rules. Integration tests verify real database behavior, transactions, schema constraints, idempotency, expiration, and concurrency. Docker/environment tests verify runtime composition, readiness, migration/seed execution, and persistence.

Traceability from executable test identifiers to source test files is maintained in `docs/TEST_MATRIX.md`; summarized execution results are maintained in `docs/TEST_SCRIPT_RESULT.md`.
