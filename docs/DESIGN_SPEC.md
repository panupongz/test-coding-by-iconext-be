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
Database Repository / Data Access
  |
  v
MySQL 8.x
```

The implemented dependency direction is Route → Controller → Application Service → database repository/data access → MySQL. HTTP concerns stay at the HTTP boundary while business orchestration is implemented by application services.

## 3. Project Structure

The implementation is organized around these responsibilities:

- `src/http/routes`: route registration.
- `src/http/controllers`: HTTP request/response handling.
- `src/http/dtos`: response boundary DTOs.
- `src/http/validation`: strict request/path/header validation.
- `src/http/middleware`: request logging and global HTTP error handling.
- `src/http/openapi.ts`: OpenAPI/Swagger definition.
- `src/application/services`: Create Sale, Payment, and Cancel orchestration.
- `src/application/errors`: application/public error definitions.
- `src/application/idempotency-key-lock.ts`: same-key serialization support.
- `src/application/request-fingerprint.ts`: deterministic request fingerprinting.
- `src/domain`: Sale and Payment domain types.
- `src/database/repositories`: concrete Sale and idempotency persistence/data access.
- `src/database/migrations`: MySQL schema migration.
- `src/database/seeds`: deterministic Product seed.
- `src/database`: connection, readiness, migration and seed runners.
- `src/infrastructure/logger.ts`: concrete structured logger.
- `src/config`: environment/configuration handling.
- `tests/unit`, `tests/integration`, `tests/environment`, `tests/support`: executable verification assets.

## 4. HTTP and API Design

The public API exposes exactly three POST action routes under `/api/v1`:

| Operation | Endpoint | Controller responsibility |
| --- | --- | --- |
| Create Sale | `POST /sales` | Validate key/body, invoke Create Sale service, map first/replay result. |
| Payment | `POST /sales/:sale_id/payment` | Validate key/path/body, invoke Payment service, map payment/expired/conflict result. |
| Cancel | `POST /sales/:sale_id/cancel` | Validate key/path/no-body contract, invoke Cancel service, map cancelled/conflict result. |

`src/app.ts` mounts the router at `/api/v1`, mounts Swagger UI at `/api-docs`, applies Helmet, strict JSON parsing with a 100 KB body limit, request logging, not-found handling, and global error handling.

Controllers remain thin. Request validation rejects unknown or malformed input before business orchestration. Response DTOs isolate public response shapes from internal/domain data.

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

A Sale represents exactly one Product unit and stores a price snapshot. Payment supports `CASH` and `QR_PAYMENT`. A database uniqueness constraint on `payments.sale_id` provides the final one-payment-per-sale integrity guard.

## 6. Transaction and Concurrency Design

Create Sale commits the Sale and successful idempotency state atomically.

Payment performs its critical business changes in a short transaction, including Sale locking/state validation, payment-rule validation, Payment creation, Sale transition, expiration protection and successful idempotency persistence. Concurrency protection combines row locking with the unique `payments.sale_id` constraint.

Cancel validates and transitions the Sale atomically with successful idempotency persistence. Expired `PENDING` Sales are persisted as `CANCELLED`.

Business failure rolls back the business transaction first. A terminal `FAILED` idempotency record is persisted separately so failed operations cannot leave partial business writes while the key remains terminal.

## 7. Idempotency Design

Every operation requires a client-generated `Idempotency-Key`. The key namespace is global across all three operations. The application derives a deterministic request fingerprint and uses `idempotency-key-lock.ts` plus database state to coordinate same-key execution.

Behavior:

- Same key + same successful logical request: return the associated existing result without executing the operation again.
- Same key + different logical request/operation: `409 IDEMPOTENCY_CONFLICT`.
- Key associated with a failed business operation: `409 IDEMPOTENCY_FAILED`.
- Concurrent same-key requests are serialized so waiters observe the committed terminal state.

The persisted design stores request fingerprint, operation/status and resource identifiers rather than a complete serialized HTTP response body.

## 8. Database Design

Core persisted concepts are Product, Sale, Payment, and `idempotency_keys`.

```text
Product 1 ─────< Sale 1 ───── 0..1 Payment
                    |
                    +── referenced by idempotency resource state
```

The migration creates `products`, `sales`, `payments`, and `idempotency_keys`. Database guarantees include unique Product code, unique Payment Sale reference, unique idempotency key, foreign-key integrity, Sale quantity constrained to one, valid Sale/payment/idempotency enums, positive integer THB fields, UUID-format checks, relative Product image-path checks, and `deleted_at` only on Product.

Schema evolution is migration-based. Product seed is deterministic and contains exactly `P001`–`P005` with relative image paths.

## 9. Validation and Error Design

Validation is performed at the HTTP boundary without implicit coercion. Public failures use one error envelope and a fixed code catalog. Application/business errors are mapped explicitly to HTTP status/code/message. Unexpected exceptions fall through a sanitized global `500 INTERNAL_SERVER_ERROR` response.

Internal stack traces, SQL/database details, credentials, and environment values are not exposed through public HTTP errors.

## 10. Configuration and Runtime Design

Docker Compose contains `backend` and `mysql` runtime services. MySQL uses version 8.x and persistent volume storage. The backend receives database settings from environment variables; inside Compose the database host is `mysql`.

`src/server.ts` loads configuration, creates the logger/database, waits for database readiness, constructs all three application services, starts the HTTP server, and registers graceful shutdown handling for SIGINT/SIGTERM.

Migration, seed, and test commands are exposed through `package.json`, including `test`, `test:unit`, `test:integration`, `test:docker`, `db:migrate`, and `db:seed`.

## 11. Logging and Security

The backend uses Pino-based structured logging. Express disables `x-powered-by` and applies Helmet. Request logging and sanitized global error handling are middleware concerns. Authentication and authorization are intentionally outside the approved scope.

## 12. OpenAPI and Documentation

`src/http/openapi.ts` provides the Swagger/OpenAPI representation and `src/app.ts` exposes Swagger UI at `/api-docs`. `docs/API.md` is the human-readable API contract. Both should remain aligned with implemented routes, status codes, DTOs, validation and the public error catalog.

## 13. Verification Strategy

Unit tests cover HTTP mapping, business rules, environment/readiness, idempotency locking/fingerprinting and OpenAPI behavior. Integration tests cover real database schema, seed, Create Sale, Payment, Cancel, validation/errors, transactions, idempotency and concurrency. Docker/environment verification covers runtime composition and persistence behavior.

Traceability from test identifiers to executable files is maintained in `docs/TEST_MATRIX.md`; actual execution status belongs in `docs/TEST_SCRIPT_RESULT.md` and must be supported by a recorded test run for the revision being documented.
