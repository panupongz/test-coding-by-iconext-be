# Software Requirements Specification (SRS)

## 1. Introduction

### 1.1 Purpose
This document defines the software requirements for the backend service implemented in `test-coding-by-iconext-be`. It describes externally observable behavior and business requirements rather than implementation details.

### 1.2 Scope
The backend provides exactly three unauthenticated REST actions under `/api/v1`: create a Sale, pay a Sale, and cancel a Sale. Product management, stock management, login/authentication/authorization, read APIs, delete APIs, and multi-item Sales are outside scope.

### 1.3 Runtime constraints
The service runs as Node.js + TypeScript + Express and uses MySQL 8.x. Development/runtime orchestration uses Docker Compose with `backend` and `mysql` services. Configuration is environment-driven.

## 2. Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-001 | The system shall create a Sale from one valid, available Product code through `POST /api/v1/sales`. |
| FR-002 | A Sale shall always represent exactly one unit and shall snapshot the Product price at creation. |
| FR-003 | A newly created Sale shall have status `PENDING` and expire five minutes after creation. |
| FR-004 | The system shall accept CASH payment for a non-expired `PENDING` Sale when the received amount is at least the Sale total and shall calculate non-negative integer THB change. |
| FR-005 | The system shall accept `QR_PAYMENT` only when the received amount exactly equals the Sale total. |
| FR-006 | A successful Payment shall create at most one Payment for the Sale and transition the Sale atomically from `PENDING` to `PAID`. |
| FR-007 | The system shall cancel a `PENDING` Sale through `POST /api/v1/sales/:sale_id/cancel`. |
| FR-008 | When a relevant action observes `expires_at <= current time` on a `PENDING` Sale, the system shall persist `CANCELLED`; Payment shall not be created. |
| FR-009 | Cancelling an already `CANCELLED` Sale shall return the existing cancelled result successfully; actions invalid for `PAID` or `CANCELLED` states shall follow the defined API conflict contract. |
| FR-010 | Every public action shall require a non-empty client-generated `Idempotency-Key` no longer than 255 characters. |
| FR-011 | A successful replay using the same key and same logical request shall not execute the business operation again and shall return the previously associated resource/result. |
| FR-012 | Reusing an idempotency key for another request/operation shall return `409 IDEMPOTENCY_CONFLICT`. |
| FR-013 | A business operation that fails after HTTP validation shall roll back business changes, persist a terminal `FAILED` idempotency record separately, and subsequent reuse of that key shall return `409 IDEMPOTENCY_FAILED`. |
| FR-014 | Concurrent requests shall preserve deterministic business integrity: the same idempotency request executes once and a Sale can have at most one successful Payment. |

## 3. Business Rules

| ID | Rule |
| --- | --- |
| BR-001 | Product codes accepted for Sale creation match `P` followed by exactly three digits and must identify an available, non-deleted Product. |
| BR-002 | Product seed data consists of exactly `P001`–`P005`; Product images use relative paths `/products/{product_code}.jpg`. |
| BR-003 | Monetary values are positive integer THB; floating-point values and numeric strings are invalid. |
| BR-004 | Sale status is limited to `PENDING`, `PAID`, and `CANCELLED`. |
| BR-005 | Expiration is inclusive: `expires_at <= observed time` means expired. |
| BR-006 | Payment must recheck expiration while operating under the required database lock before commit. |
| BR-007 | Cancel accepts no JSON request body; any JSON body, including `{}` or `null`, is invalid. |
| BR-008 | Idempotency keys are global across Create Sale, Payment, and Cancel and successful records do not expire for replay. |

## 4. API Requirements

| ID | Endpoint | Initial success | Replay success |
| --- | --- | ---: | ---: |
| API-001 | `POST /api/v1/sales` | `201` | `200` |
| API-002 | `POST /api/v1/sales/:sale_id/payment` | `201` | `200` |
| API-003 | `POST /api/v1/sales/:sale_id/cancel` | `200` | `200` |

All JSON request boundaries use strict validation. Missing fields, unknown fields, wrong types, malformed JSON, unsupported enum values, and implicit numeric coercion shall be rejected according to the API contract.

## 5. Data Requirements

| ID | Requirement |
| --- | --- |
| DR-001 | Product code, Payment Sale reference, and idempotency key uniqueness shall be enforced by the database. |
| DR-002 | Foreign keys shall enforce Sale → Product, Payment → Sale, and required idempotency resource relationships. |
| DR-003 | `deleted_at` exists only for Products; Sales and Payments do not support soft deletion. |
| DR-004 | Timestamps shall be stored with UTC semantics and public timestamps returned as ISO 8601 UTC values. |
| DR-005 | Successful business changes and successful idempotency state shall commit atomically. |

## 6. Error and Validation Requirements

Public client errors use a common envelope containing a fixed error code and a non-empty Thai message. Approved codes include `VALIDATION_ERROR`, `MALFORMED_JSON`, `INVALID_PRODUCT_CODE`, `PRODUCT_NOT_FOUND`, `SALE_NOT_FOUND`, `SALE_ALREADY_PAID`, `SALE_CANCELLED`, `INSUFFICIENT_CASH_AMOUNT`, `QR_AMOUNT_MISMATCH`, `UNSUPPORTED_PAYMENT_METHOD`, `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_TOO_LONG`, `IDEMPOTENCY_CONFLICT`, `IDEMPOTENCY_FAILED`, and `INTERNAL_SERVER_ERROR`.

Unexpected failures shall not expose stack traces, SQL, credentials, environment values, or internal exception details.

## 7. Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-001 | The service shall use strict TypeScript and maintain separation of HTTP, business, and persistence concerns. |
| NFR-002 | Critical writes shall use short database transactions and row locking where concurrency requires it. |
| NFR-003 | Configuration and secrets shall be environment-driven; real `.env` and credentials shall not be committed. |
| NFR-004 | Server logging shall support operational diagnosis without logging secrets or credentials. |
| NFR-005 | The application, migration, seed, and tests shall be executable in the Docker Compose development environment. |
| NFR-006 | Database state shall persist through the configured MySQL Docker volume. |

## 8. Traceability

Detailed API examples and error mappings are maintained in `docs/API.md`. Requirement-to-executable-test coverage is maintained in `docs/TEST_MATRIX.md`. Implementation architecture is documented in `docs/DESIGN_SPEC.md`, and execution evidence/results are documented in `docs/TEST_SCRIPT_RESULT.md`.
