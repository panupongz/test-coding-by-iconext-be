# Requirement, Architecture, Engineering and Audit Governance Prompts

ไฟล์นี้เก็บ user prompts ที่ใช้กำหนด requirements, architecture, engineering standards และ prompt-audit governance ก่อนเริ่ม implementation

## Prompt #1

```text
วิเคราะห์ Backend requirements ทั้ง 149 ข้อที่ให้ไว้ โดยยังไม่ implement code\
&#x20;สร้าง `docs/IMPLEMENTATION_CHECKLIST.md` จาก 10 Main Tasks และแตกแต่ละ Task เป็น Sub-task ที่ implement/test ได้จริง\
&#x20;ตรวจหา requirement ที่ซ้ำ ขัดแย้ง หรือยังไม่ชัดเจนก่อน\
&#x20;ถ้าพบ conflict ห้ามตัดสิน business rule เอง ให้ทำ Task นั้นเป็น `BLOCKED` พร้อมระบุ requirement ที่ขัดกันและคำถามที่ต้องให้ฉันตัดสิน\
&#x20;ทุก Task ต้องมี Definition of Done และ Test cases ที่ต้องผ่าน\
&#x20;ใช้ requirements เป็น Source of Truth และห้ามเพิ่ม business requirement เอง\
&#x20;หลังสร้าง checklist แล้วให้หยุดก่อน ยังไม่ implement code และแสดงรายการ BLOCKED/Conflict ทั้งหมดให้ฉันตรวจ  
```

## Prompt #2

```text
ก่อนเริ่ม Implement Backend ให้ update requirement decisions ล่าสุดลงใน
docs/IMPLEMENTATION_CHECKLIST.md

ให้ถือ decisions ด้านล่างนี้เป็น Source of Truth ล่าสุด และ supersede requirement เดิมที่ขัดแย้งกัน

=== RESOLVED CONFLICTS ===

C01 — Create Sale Idempotency Retry
Decision: A

Same Idempotency-Key + same Create Sale request:
- Return the existing Sale
- HTTP 200 OK
- Do not create a new Sale
- This remains valid even if the Sale has subsequently changed to PAID or CANCELLED
- Return the current Sale data/status
- This supersedes Q146 for Create Sale

C02 — Payment Idempotency Retry
Decision: A

Same Idempotency-Key + same Payment request after the original payment successfully committed:
- Return the existing Payment
- HTTP 200 OK
- Do not create another Payment
- Sale being PAID does not cause a conflict when the PAID state resulted from the original Payment
- This supports retry after lost/network-timeout responses
- This supersedes Q146 for Payment

C03 — Cancel Idempotency Retry
Decision: A

Same Idempotency-Key + same Cancel request:
- Return HTTP 200 OK
- Return the existing CANCELLED result
- Do not perform another state transition
- Sale already being CANCELLED does not cause a conflict for the same idempotent operation
- This supersedes Q146 for Cancel

General idempotency rule after C01-C03:
Same key + same request = return the result of the original operation without executing the operation again.

Same key + different request = 409 Conflict.

C04 — Failed Operation Idempotency
Decision: A

If an operation fails:
- Roll back the Business Transaction
- The Idempotency-Key must still be remembered as FAILED
- Persist the FAILED idempotency record separately from the rolled-back Business Transaction
- A retry using that same key must return 409 Conflict
- The key cannot be reused for a new request

This intentionally means failed-idempotency persistence is separate from the rolled-back business transaction.

=== RESOLVED UNCLEAR REQUIREMENTS ===

U01 — Expired Sale State
Decision: A

When a PENDING Sale passes expires_at and a relevant POST/action request detects the expiration:
- Persist the state transition in DB:
  PENDING -> CANCELLED
- Perform the transition transactionally
- Do not only calculate an expired status dynamically

U02 — Payment Request on Expired Sale
Decision: A

If Payment is requested for an expired PENDING Sale:
- Change Sale from PENDING -> CANCELLED
- Do NOT create Payment
- Return HTTP 200 OK

Response:

{
  "sale_id": "...",
  "status": "CANCELLED"
}

U03 — Initial Create Sale HTTP Status
Decision: A

First successful Create Sale:
- HTTP 201 Created

Idempotent retry with same key + same request:
- HTTP 200 OK
- Return existing Sale
- Do not create another Sale

U04 — Cancel Request Body
Decision: A

POST /api/v1/sales/{sale_id}/cancel

Uses:
- sale_id from Path
- Idempotency-Key from Header
- No Request Body

If a JSON request body is supplied:
- Reject with 400 Bad Request according to strict validation

U05 — Product Seed Source
Decision: B

Do not depend on ICONEXT-provided product data.

Create Mock Product Seed Data for this backend.

Each Product contains:
- product_code
- name
- description
- image
- price

Seed must follow the previously defined idempotency rules.

U06 — Number of Mock Products
Decision: A

Create exactly 5 Mock Products:
- P001
- P002
- P003
- P004
- P005

Codex may choose reasonable mock:
- name
- description
- price

price must be integer THB.

U07 — deleted_at
Decision: B

deleted_at exists ONLY on:
- products

Do NOT add deleted_at to:
- sales
- payments

Sales and Payments are transaction history.

U08 — Product Image
Decision: A

Store Product image as a Relative Path.

Example:

/products/P001.jpg

Do not store:
- absolute URL
- localhost URL
- production domain

=== REQUIRED ACTION ===

1. Read the current docs/IMPLEMENTATION_CHECKLIST.md.
2. Apply C01-C04 and U01-U08 above.
3. Update the relevant Tasks/Sub-tasks/Acceptance Criteria/Test Cases.
4. Mark these 12 items as RESOLVED.
5. Remove BLOCKED status where the only blocker was one of these 12 items.
6. Preserve all other requirements from the original 149-question requirement discovery.
7. Do NOT invent or change business requirements.
8. Check again for contradictions created by these new decisions.
9. If another genuine requirement conflict or missing business decision remains:
   - mark the affected task BLOCKED
   - clearly explain the conflict
   - do not decide the business rule yourself
10. Do NOT implement production code yet.
11. Do NOT modify application source code yet.
12. Only update requirement/checklist/documentation needed to reflect these decisions.

After updating the checklist, stop and report:

- which Tasks were unblocked
- which Tasks remain BLOCKED
- any remaining requirement conflicts
- any remaining unclear requirements
- summary of changes made to docs/IMPLEMENTATION_CHECKLIST.md

Do not start implementation until I explicitly approve the updated checklist.
```

## Prompt #3

```text
Add the following approved Architecture Decision to
docs/IMPLEMENTATION\_CHECKLIST.md.

This decision is now part of the Source of Truth for
test-coding-by-iconext-be.

\=== CONTAINER ARCHITECTURE ===

Use Docker Compose with two services:

1. backend

   - Node.js
   - TypeScript
   - Express

2. mysql

   - MySQL 8.x

Target architecture:

Docker Compose
│
├── backend
│   └── Node.js + TypeScript + Express
│
└── mysql
└── MySQL 8.x

Requirements:

- Backend must run inside its own Docker container.
- MySQL must run inside its own Docker container.
- Both services must communicate through the Docker Compose network.
- Backend database configuration must come from environment variables.
- Do not hard-code database host, port, username, password, or database name.
- Inside Docker Compose, backend must connect to MySQL using the service name `mysql`, not localhost.
- Add a MySQL healthcheck.
- Backend startup must account for MySQL readiness.
- Persist MySQL data using a Docker volume.
- Provide `.env.example`.
- Do not commit real secrets or `.env`.
- Add an appropriate `.gitignore` and `.dockerignore`.
- Use MySQL 8.x.
- Keep database migration and seed commands executable inside the backend container.
- The project should be runnable using Docker Compose.
- Document Docker setup/run/migration/seed/test commands in README.

Update the relevant Main Task/Sub-tasks, especially T-001 and T-002.

Add Definition of Done and test/verification steps for the Docker environment.

Do not implement code yet if the current instruction is still checklist-only.
Do not change any previously approved business requirements.

After updating the checklist, report:

1. What was added
2. Which Tasks were affected
3. Whether this creates any new BLOCKED item or requirement conflict
```

## Prompt #4

```text
Before starting implementation, update
docs/IMPLEMENTATION_CHECKLIST.md with the following approved
Architecture and Engineering Standards.

These decisions are now part of the Source of Truth for
test-coding-by-iconext-be.

Do NOT change previously approved business requirements.

==================================================
1. APPROVED CONTAINER ARCHITECTURE
==================================================

Use Docker Compose with two services:

Docker Compose
│
├── backend
│   └── Node.js + TypeScript + Express
│
└── mysql
    └── MySQL 8.x

Requirements:

- Backend runs inside its own Docker container.
- MySQL runs inside its own Docker container.
- Services communicate through the Docker Compose network.
- Backend connects to MySQL using service name `mysql`,
  not `localhost`.
- Database configuration comes from environment variables.
- Never hard-code DB host, port, username, password,
  database name, or secrets.
- Provide `.env.example`.
- Do not commit `.env`.
- Provide appropriate `.gitignore` and `.dockerignore`.
- MySQL must have a healthcheck.
- Backend startup must account for MySQL readiness.
- Persist MySQL data using a Docker volume.
- Migration and seed commands must be executable
  inside the backend container.
- Project must be runnable through Docker Compose.
- README must document setup/run/migration/seed/test commands.

==================================================
2. BACKEND ENGINEERING STANDARD
==================================================

Implementation must target production-quality,
senior-level backend engineering practices appropriate
for a coding assignment.

Prefer simple, explicit, maintainable solutions over
unnecessary abstraction.

Use strict TypeScript.

Avoid:
- `any` unless technically unavoidable and documented
- duplicated business logic
- large controllers
- hidden side effects
- magic strings
- magic numbers
- unnecessary abstractions
- premature generic frameworks
- over-engineering

Use clear naming and explicit types.

==================================================
3. ARCHITECTURE / SEPARATION OF CONCERNS
==================================================

Maintain clear responsibilities.

Recommended dependency flow:

Route
  ↓
Controller
  ↓
Service / Use Case
  ↓
Repository / Data Access
  ↓
MySQL

Responsibilities:

Route:
- HTTP routing
- middleware composition

Controller:
- HTTP concerns only
- request extraction
- calling application/service layer
- mapping result to HTTP response

Controller must NOT contain complex business logic.

Service / Use Case:
- business rules
- Sale state transitions
- payment rules
- expiration rules
- idempotency orchestration
- transaction orchestration where appropriate

Repository / Data Access:
- database queries
- row locking
- persistence
- DB-specific operations

Validation:
- validate input at the application boundary
- use strict schemas
- reject unknown fields

Do not introduce interfaces/abstractions unless they
provide concrete value to this project.

==================================================
4. DATABASE ENGINEERING
==================================================

Database: MySQL 8.x

Use migrations.

Use the previously approved schema requirements for:

- products
- sales
- payments
- idempotency_keys

Enforce integrity at database level where appropriate:

- Foreign Keys
- Unique Indexes
- NOT NULL
- appropriate column types

Required unique constraints include:

- products.product_code
- idempotency_keys.key
- payments.sale_id

Use integer THB for monetary values.

Do not use floating-point types for money.

Use UTC for stored timestamps.

Use MySQL default transaction isolation level unless
an approved requirement explicitly requires otherwise.

==================================================
5. TRANSACTION STANDARD
==================================================

Transactions must represent business atomicity,
not simply wrap every query without reason.

Critical write operations must use transactions.

Examples:

Create Sale:
- required writes must be atomic

Payment:
- lock Sale where required
- validate state
- validate expiration
- validate payment
- create Payment
- update Sale
- commit atomically

Cancel:
- state validation and transition must be atomic

Use row-level locking where required for concurrency,
such as SELECT ... FOR UPDATE.

Do not hold transactions open longer than necessary.

==================================================
6. IDEMPOTENCY STANDARD
==================================================

Implement the approved C01-C04 decisions exactly.

General rule:

same Idempotency-Key + same request
→ return result of original operation
→ do not execute operation again

same Idempotency-Key + different request
→ 409 Conflict

Successfully committed operations must support safe
retry after lost responses.

Failed operations:
- business transaction rolls back
- Idempotency-Key remains recorded as FAILED
- failed-key persistence is handled separately from
  the rolled-back business transaction
- retry using that key → 409 Conflict

Do not silently weaken these guarantees.

Use deterministic request fingerprint/hash for
idempotency comparison.

Do not store the full response body merely to implement
idempotency unless an approved requirement requires it.

==================================================
7. CONCURRENCY STANDARD
==================================================

Concurrency behavior must be deterministic.

Payment must prevent duplicate successful payments.

For concurrent payment requests against the same Sale:

- lock the Sale appropriately
- only one valid payment may succeed
- payments.sale_id UNIQUE is the final DB integrity guard
- the losing request follows the approved API behavior

Expiration must be checked according to the approved
rules, including the second check before Payment commit.

Write integration tests for concurrency-sensitive behavior.

==================================================
8. VALIDATION STANDARD
==================================================

All API contracts use strict validation.

Reject:

- missing required fields
- unknown fields
- wrong types
- malformed JSON
- invalid enum values
- invalid business input

Do not perform implicit type coercion.

Example:

"amount_received": "100"

must NOT be accepted as numeric 100.

Use the previously approved HTTP status behavior.

==================================================
9. ERROR HANDLING STANDARD
==================================================

Use the approved standardized error contract:

{
  "error": {
    "code": "...",
    "message": "..."
  }
}

Requirements:

- error.code comes from a fixed application enum/list
- error.message is Thai
- business errors are mapped intentionally
- unexpected exceptions fall through to a global
  fallback handler
- 500 responses never expose:
  - stack traces
  - SQL
  - DB errors
  - credentials
  - internal exception details

Internal details may be logged server-side.

==================================================
10. CONFIGURATION / SECURITY BASELINE
==================================================

Configuration must be environment-driven.

Validate required environment variables during startup.

Never commit:
- passwords
- secrets
- real `.env`
- credentials

Apply reasonable HTTP security baseline for Express
where useful and appropriate.

Do not add authentication because the approved
business requirements explicitly do not require login.

Do not invent authorization requirements.

Dependencies must be kept minimal and justified.

==================================================
11. LOGGING
==================================================

Use structured, useful server-side logging.

Log operational failures with enough context for debugging.

Never log:
- secrets
- passwords
- sensitive environment variables
- raw internal credentials

Do not add unnecessary enterprise observability
infrastructure for this coding assignment.

==================================================
12. TESTING STANDARD
==================================================

Testing is mandatory.

Use both:

1. Unit Tests
2. Integration Tests

Test business-critical behavior, not only happy paths.

Coverage must include at minimum:

Create Sale:
- valid creation
- invalid product_code format
- product not found
- strict validation
- idempotent retry
- same key + different request
- failed-key behavior

Payment:
- CASH exact payment
- CASH overpayment/change
- CASH insufficient amount
- QR exact amount
- QR mismatch
- unsupported payment method
- wrong amount type
- PAID Sale
- CANCELLED Sale
- expired Sale
- expiry during transaction
- idempotent retry
- same key + different request
- concurrent payments
- transaction rollback

Cancel:
- PENDING Sale
- expired Sale
- PAID Sale
- already CANCELLED Sale
- idempotent retry
- same key + different request
- unexpected body

Seed:
- first execution
- repeated execution with identical data
- existing Product with conflicting data

Error responses:
- fixed error codes
- Thai messages
- sanitized 500 response

==================================================
13. SENIOR REVIEW GATE
==================================================

A Task is NOT DONE merely because the code compiles
or tests pass.

Every implementation Task must go through:

IMPLEMENT
    ↓
TEST
    ↓
SENIOR REVIEW
    ↓
FIX FINDINGS
    ↓
RE-RUN TESTS
    ↓
UPDATE CHECKLIST
    ↓
DONE

Senior Review must check:

- correctness against approved requirements
- architecture
- separation of concerns
- transaction boundaries
- concurrency correctness
- idempotency correctness
- validation
- error handling
- database integrity
- TypeScript quality
- readability
- maintainability
- duplication
- security baseline
- test quality
- unnecessary complexity

A Task may only become DONE when:

1. Requirement acceptance criteria pass
2. Required tests pass
3. Senior Review has no unresolved HIGH or MEDIUM findings
4. Checklist reflects the actual implementation state

==================================================
14. DEFINITION OF DONE
==================================================

Each Main Task and implementation Sub-task must have
a Definition of Done.

At minimum:

[ ] Implementation matches approved requirements
[ ] No unresolved requirement conflict
[ ] Strict TypeScript passes
[ ] Lint passes
[ ] Relevant unit tests pass
[ ] Relevant integration tests pass
[ ] Senior Review completed
[ ] No unresolved HIGH/MEDIUM findings
[ ] Documentation updated where necessary
[ ] IMPLEMENTATION_CHECKLIST.md updated

Do not mark a Task DONE prematurely.

==================================================
15. CHECKLIST TRACEABILITY
==================================================

Update docs/IMPLEMENTATION_CHECKLIST.md so that:

149 original requirements
+
C01-C04 resolved conflicts
+
U01-U08 resolved unclear requirements
+
this Architecture Decision
+
these Engineering Standards

form the complete current Source of Truth.

Each Main Task should contain:

- Objective
- Requirement references
- Sub-tasks
- Acceptance Criteria
- Required Tests
- Definition of Done
- Current Status

Use statuses consistently:

TODO
IN_PROGRESS
BLOCKED
REVIEW
DONE

Do not remove useful requirement traceability.

==================================================
CURRENT ACTION
==================================================

For THIS RUN:

1. Read the existing docs/IMPLEMENTATION_CHECKLIST.md.
2. Integrate the Docker Architecture above.
3. Integrate the Engineering Standards above.
4. Update affected Tasks/Sub-tasks.
5. Add the Senior Review Gate and Definition of Done.
6. Re-check the complete checklist for contradictions,
   missing decisions, or architecture conflicts.
7. Do NOT implement production code yet.
8. Do NOT modify application source code yet.

If a genuine BUSINESS requirement is still unclear:

- do not guess
- mark the affected Task BLOCKED
- explain exactly what decision is required

For technical implementation details that do not alter
business behavior, choose a simple, conventional,
well-justified solution.

After updating the checklist, STOP and report:

1. Tasks currently READY
2. Tasks currently BLOCKED
3. Remaining business requirement conflicts
4. Remaining unclear business requirements
5. Architecture/engineering changes added
6. Senior Review Gates added
7. Files modified
8. Whether implementation can safely begin

Do not start implementation until I explicitly approve it.
```

## Prompt #5

```text
\==================================================
AI / CODEX PROMPT AUDIT TRAIL
=============================

This project must maintain an auditable record of the
Codex prompts used during implementation.

Create:

docs/prompts/

and maintain one Markdown file per Main Task:

docs/prompts/
├── README.md
├── 00-requirement-and-architecture.md
├── T-001-project-setup.md
├── T-002-database-schema.md
├── T-003-product-seed.md
├── T-004-create-sale.md
├── T-005-payment.md
├── T-006-cancel-expiration.md
├── T-007-validation-errors.md
├── T-008-db-integrity.md
├── T-009-testing.md
└── T-010-documentation.md

For every implementation Task, maintain:

1. Task ID and title
2. Objective
3. Requirement references
4. Exact user prompt sent to Codex
5. Additional/follow-up prompts used for that Task
6. Codex implementation summary
7. Files created/modified
8. Tests executed
9. Test results
10. Senior Review findings
11. Fixes made after review
12. Final Task status

IMPORTANT:

The original prompts must be preserved verbatim.

Do not rewrite or improve a historical prompt after it
has already been used.

If another prompt is required, append it as:

Prompt #2
Prompt #3
...

This directory is an audit trail intended for external
review by the ICONEXT team.

Never include secrets, credentials, tokens, passwords,
.env contents, or other sensitive information in the
prompt logs.

A Task cannot be marked DONE until its corresponding
prompt audit file is updated.

Update the Definition of Done for every Main Task with:

[ ] Prompt audit trail updated
```

## Prompt #6

```text
Perform the FINAL PRE-IMPLEMENTATION GATE for
test-coding-by-iconext-be.

Do NOT implement application code in this run.

Review the complete current Source of Truth:

- Original Q001-Q149 requirements
- Resolved conflicts C01-C04
- Resolved unclear requirements U01-U08
- docs/IMPLEMENTATION\_CHECKLIST.md
- Approved Docker Compose architecture
- Senior Engineering Standards
- Testing standards
- Senior Review Gate
- Prompt Audit Trail requirements

Verify the following:

1. REQUIREMENT COMPLETENESS

- No unresolved business requirement conflicts
- No unresolved unclear business requirements
- No contradictory acceptance criteria
- Latest decisions supersede conflicting older decisions

2. TASK TRACEABILITY
   Verify all approved requirements are mapped to at least
   one Task/Sub-task in IMPLEMENTATION\_CHECKLIST.md.

Report any orphan requirement.

3. TASK DEPENDENCIES
   Verify T-001 through T-010 are ordered correctly.

Identify dependencies between Tasks and confirm no Task
requires something that has not been implemented yet.

4. DATABASE READINESS
   Confirm the checklist covers:

- MySQL 8.x
- products
- sales
- payments
- idempotency\_keys
- PK/FK
- required unique indexes
- transaction requirements
- row locking
- UTC timestamps
- integer THB
- migrations
- idempotent seed

5. DOCKER READINESS
   Confirm:

- backend container
- mysql container
- Docker Compose network
- MySQL healthcheck
- backend startup/readiness
- persistent MySQL volume
- environment configuration
- .env.example
- .gitignore
- .dockerignore
- migration/seed/test commands usable from container

6. API CONTRACT READINESS
   Confirm exact contracts exist for:

POST /api/v1/sales

POST /api/v1/sales/{sale\_id}/payment

POST /api/v1/sales/{sale\_id}/cancel

Verify:

- request body
- path parameters
- headers
- success response
- error response
- HTTP status codes
- strict validation
- Idempotency-Key behavior

7. IDEMPOTENCY READINESS
   Confirm C01-C04 are internally consistent.

Specifically verify:

- same key + same request
- same key + different request
- successful retry
- failed operation
- FAILED key persistence
- deterministic request fingerprint
- concurrent same-key requests

Do not redesign these rules.

8. CONCURRENCY / TRANSACTION READINESS
   Verify the checklist explicitly covers:

- concurrent Payment requests
- SELECT ... FOR UPDATE / equivalent row lock
- payments.sale\_id UNIQUE protection
- expiration race
- second expiration check before Payment commit
- rollback behavior

9. TEST READINESS
   Verify every business-critical requirement has an
   associated test or acceptance test.

Check:

- happy paths
- validation failures
- state transitions
- expiration
- idempotency
- transaction rollback
- concurrency
- seed idempotency
- standardized Thai errors

10. ENGINEERING QUALITY GATE
    Confirm every implementation Task includes:

Implement
→ Test
→ Senior Review
→ Fix Findings
→ Re-test
→ Update Checklist
→ Update Prompt Audit
→ DONE

11. PROMPT AUDIT READINESS
    Confirm docs/prompts/ exists and the required audit
    structure is represented in the checklist.

Every Task must preserve:

- exact prompt
- follow-up prompts
- implementation summary
- files changed
- tests/results
- review findings
- fixes
- final status

Never store secrets in prompt logs.

12. IMPLEMENTATION ENVIRONMENT
    Identify any technical decision that MUST be selected
    before T-001 can safely start.

Distinguish between:

A. BUSINESS DECISION
Must be confirmed by me.

B. TECHNICAL IMPLEMENTATION DECISION
Codex may choose a conventional senior-level solution
without changing business behavior.

Do not create unnecessary blockers for ordinary
technical implementation choices.

\==================================================
FINAL OUTPUT
============

Return exactly these sections:

1. FINAL GATE: PASS or BLOCKED

2. Business conflicts remaining

- count
- details

3. Unclear business requirements remaining

- count
- details

4. Orphan requirements

- count
- requirement IDs

5. Task dependency problems

- count
- details

6. Missing test coverage requirements

- count
- details

7. Technical decisions Codex can safely make during
   implementation

8. Tasks READY to implement

9. Tasks BLOCKED

10. Files checked

11. Recommendation:
    IMPLEMENTATION CAN START
    or
    IMPLEMENTATION MUST NOT START

If the Final Gate is PASS:
STOP.
Do NOT begin T-001.

If BLOCKED:
STOP and explain only the decisions required from me.
```

## Audit status

- Requirements/architecture/governance prompts recorded: 6
- Production implementation started: No
- Task implementation prompts recorded: 0
