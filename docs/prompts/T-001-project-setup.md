# T-001 — Backend TypeScript + Express

## Task ID and title

T-001 — Backend TypeScript + Express

## Objective

สร้าง runtime/application foundation ที่รันใน Docker Compose, ใช้ strict TypeScript + Express และแยก HTTP/application/data responsibilities ชัดเจน

## Requirement references

Q001–Q003, Q023–Q025, Q122–Q126, Q133–Q136, Q149; AD01; ES01–ES02; ES08–ES10; SRG01; AUD01

## Exact user prompt sent to Codex

Recorded at: 2026-09-16 23:55:15 +07:00

Purpose: Initial T-001 implementation.

### Prompt #1 — Initial T-001 Implementation

````text
Start implementation of T-001 — Project Setup for
test-coding-by-iconext-be.

This is the first production implementation task.

Work ONLY on T-001.

Do NOT start T-002 or any later task.

The complete approved Source of Truth already exists in
the repository and must be followed:

- docs/IMPLEMENTATION_CHECKLIST.md
- Original Q001-Q149 requirements
- Resolved conflicts RC01-RC04
- Resolved unclear requirements RU01-RU08
- Approved Docker architecture
- Approved Engineering Standards
- Senior Review Gate
- Prompt Audit requirements

==================================================
0. PROMPT AUDIT — REQUIRED BEFORE IMPLEMENTATION
==================================================

Before modifying application/source code:

1. Open:
   docs/prompts/T-001-project-setup.md

2. Append this instruction as:

   Prompt #1 — Initial T-001 Implementation

3. Preserve the user-provided prompt verbatim if the
   current Codex environment exposes the exact prompt
   text reliably.

4. Do NOT paraphrase, summarize, improve, or rewrite
   historical prompt text.

5. If the environment cannot reliably access the exact
   user prompt verbatim:
   - explicitly record that limitation in the audit file
   - do NOT fabricate or reconstruct the prompt
   - continue the implementation
   - report this limitation at the end so the exact prompt
     can be inserted manually.

6. Record:
   - date/time if available
   - purpose
   - Prompt #1

Never store secrets, tokens, passwords, credentials,
or real .env values in the audit log.

==================================================
1. TASK SCOPE
==================================================

Implement ONLY T-001 according to the current
docs/IMPLEMENTATION_CHECKLIST.md.

Before coding:

- read the complete T-001 section
- read its requirement references
- read its acceptance criteria
- read its required tests
- read its Definition of Done
- inspect existing repository contents

Do not implement business functionality belonging to
T-002 through T-010.

Do not implement Sale, Payment, Cancel, Product Seed,
or database business schema unless explicitly required
as T-001 foundation by the approved checklist.

==================================================
2. PROJECT FOUNDATION
==================================================

Set up a professional Node.js + TypeScript + Express
backend foundation.

Use a current Node.js LTS version.

Codex may select conventional technical implementation
details that do not alter approved business behavior.

Requirements:

- TypeScript strict mode
- Express
- clean project structure
- environment-driven configuration
- startup environment validation
- development command
- build command
- production/start command
- lint command
- typecheck command
- test command
- appropriate package manager configuration
- minimal justified dependencies

Avoid:
- any unless unavoidable and documented
- unnecessary abstractions
- premature framework design
- business logic in infrastructure setup
- magic configuration values

==================================================
3. ARCHITECTURE FOUNDATION
==================================================

Prepare the project structure for the approved dependency
flow:

Route
  ↓
Controller
  ↓
Service / Use Case
  ↓
Repository / Data Access
  ↓
MySQL

Do not create unnecessary empty abstractions purely to
satisfy this diagram.

Create only foundation that provides value at T-001.

Maintain separation of concerns.

==================================================
4. DOCKER
==================================================

Implement the approved Docker Compose architecture:

Docker Compose
│
├── backend
│   └── Node.js + TypeScript + Express
│
└── mysql
    └── MySQL 8.x

Requirements:

- backend has its own Docker container
- mysql has its own Docker container
- both communicate using Docker Compose networking
- backend uses `mysql` as DB host inside Compose
- never use localhost for container-to-container DB access
- MySQL 8.x
- MySQL healthcheck
- backend startup accounts for MySQL readiness
- persistent MySQL Docker volume
- environment-driven configuration
- no hard-coded credentials
- no committed real .env

Provide:

- Dockerfile
- compose configuration
- .dockerignore
- .env.example
- .gitignore

Use a sensible production-oriented Docker build strategy
without over-engineering the coding assignment.

==================================================
5. DATABASE CONNECTION FOUNDATION
==================================================

Prepare the MySQL connection/migration foundation required
for later tasks.

Codex may select a conventional migration/query library
appropriate for TypeScript + MySQL.

Do NOT implement T-002 business schema in this task unless
the checklist explicitly places part of it in T-001.

Database configuration must come from environment variables.

Expected configuration categories include:

- DB host
- DB port
- DB name
- DB user
- DB password

Inside Docker Compose, DB host must resolve to:

mysql

Do not expose real credentials.

Migration and seed commands must be executable from the
backend container when those migrations/seeds exist.

==================================================
6. EXPRESS FOUNDATION
==================================================

Create the minimum useful Express application foundation.

Include an appropriate basic health endpoint if consistent
with T-001 and the checklist.

Keep infrastructure concerns separate from application
startup where useful.

Prepare for:
- routes
- controllers
- services
- repositories
- validation
- error handling

Do not prematurely implement later business endpoints.

==================================================
7. CONFIGURATION & SECURITY BASELINE
==================================================

Validate required environment configuration at startup.

Fail fast with a clear internal startup error when required
configuration is missing.

Do not leak secrets.

Apply a reasonable lightweight Express security baseline
where appropriate.

Do NOT add authentication or authorization.

Authentication is explicitly outside the approved business
requirements.

Do not add unnecessary enterprise infrastructure.

==================================================
8. LOGGING FOUNDATION
==================================================

Provide a simple, structured, maintainable logging
foundation if required by T-001.

Do not log:
- secrets
- DB passwords
- credentials
- complete environment contents

Avoid unnecessary observability infrastructure.

==================================================
9. TEST FOUNDATION
==================================================

Set up the approved testing foundation.

Codex may choose a conventional test framework appropriate
for Node.js + TypeScript + Express.

Provide enough testing infrastructure for later:

- unit tests
- integration tests

For T-001, test the foundation that actually exists.

Do not create fake tests solely to increase test count.

Tests should provide meaningful signals.

==================================================
10. QUALITY COMMANDS
==================================================

The project must provide working commands for applicable
quality checks, including:

- build
- typecheck
- lint
- test

Run all T-001-relevant checks.

Do not report PASS unless the command was actually executed
successfully.

==================================================
11. DEBUGGING DISCIPLINE
==================================================

The repository contains:

.agents/skills/debug-mantra/SKILL.md

If any implementation/test/runtime/Docker/MySQL failure
requires debugging, use the debug-mantra skill according
to its instructions.

Use it for actual debugging sessions, not as ceremony when
nothing has failed.

Do not bypass a reproducible failure by blindly changing
code until tests happen to pass.

When debugging:
- reproduce
- trace the fail path
- falsify hypotheses
- maintain breadcrumbs
- fix the root cause
- add/retain regression coverage where appropriate

==================================================
12. SENIOR REVIEW GATE
==================================================

After implementation and tests, perform a Senior Review
of T-001.

Review:

- architecture
- separation of concerns
- TypeScript quality
- configuration
- Docker design
- dependency choices
- security baseline
- logging
- error handling foundation
- maintainability
- readability
- unnecessary complexity
- test quality
- checklist compliance

Classify findings as:

HIGH
MEDIUM
LOW

T-001 cannot be DONE while unresolved HIGH or MEDIUM
findings remain.

If HIGH/MEDIUM findings exist:

FIX
→ RE-RUN RELEVANT TESTS
→ RE-REVIEW

Do not mark the task DONE prematurely.

==================================================
13. PROMPT AUDIT — FINAL UPDATE
==================================================

Before finishing T-001, update:

docs/prompts/T-001-project-setup.md

Record:

- Objective
- Requirement references
- Prompt #1 / exact prompt status
- Implementation summary
- Technical decisions made
- Files created
- Files modified
- Commands/tests executed
- Actual test results
- Senior Review findings
- Fixes made
- Remaining LOW findings, if any
- Final Task status

If additional user prompts are provided during T-001,
append them chronologically as:

Prompt #2
Prompt #3
...

Never overwrite Prompt #1.

==================================================
14. CHECKLIST UPDATE
==================================================

Update:

docs/IMPLEMENTATION_CHECKLIST.md

while working:

TODO
→ IN_PROGRESS
→ REVIEW
→ DONE

Only update T-001 and directly relevant governance/audit
metadata.

Do not modify later Tasks merely to make progress appear
greater.

Mark T-001 DONE only when its complete Definition of Done
is satisfied.

==================================================
15. GIT / CHANGE DISCIPLINE
==================================================

Keep changes scoped to T-001.

Do not mix unrelated refactors.

Do not commit secrets.

Do not delete requirement/audit documentation.

Do not rewrite historical prompt records.

Do not start T-002.

If Git operations are available, do not push unrelated
changes.

==================================================
16. STOP CONDITIONS
==================================================

STOP and ask me before making a decision if you discover:

- a new business requirement conflict
- a missing business decision
- a requirement that cannot be implemented without changing
  approved behavior
- a contradiction in the current Source of Truth

Do NOT create blockers for ordinary technical decisions.

For conventional technical choices that do not change
business behavior, make a senior-level decision and document
the reasoning.

==================================================
17. REQUIRED FINAL REPORT
==================================================

When T-001 is complete, STOP.

Do NOT begin T-002.

Report exactly:

1. T-001 STATUS
   DONE / BLOCKED

2. IMPLEMENTATION SUMMARY

3. TECHNICAL DECISIONS
   Include major libraries/tools selected and why.

4. FILES CREATED

5. FILES MODIFIED

6. COMMANDS / TESTS EXECUTED
   Include actual PASS/FAIL results.

7. DOCKER VERIFICATION
   Include what was actually verified.

8. SENIOR REVIEW
   HIGH:
   MEDIUM:
   LOW:

9. FIXES AFTER REVIEW

10. PROMPT AUDIT STATUS

11. CHECKLIST STATUS

12. REMAINING ISSUES

13. GIT STATUS SUMMARY

14. NEXT TASK
    State T-002 only.
    Do NOT start it.

Accuracy is more important than claiming completion.

If something could not actually be executed or verified,
say so explicitly instead of marking it PASS.
````

Exact prompt status: Preserved verbatim from the user-provided attachment. No secret or real environment value was present or added.

## Additional / follow-up prompts

None.

## Codex implementation summary

Completed the T-001 Node.js + strict TypeScript + Express foundation. Added the three approved `/api/v1` POST route placeholders without business behavior; startup environment validation; UTC/MySQL configuration; MySQL connection readiness retries before binding the HTTP port; Helmet security headers; structured Pino logging with secret redaction; a sanitized global `500` fallback; Knex/MySQL2 migration and seed runners with no T-002 schema or seed data; unit and integration test foundations; and a two-service Docker Compose environment with persistent MySQL storage and health checks.

No Sale, Payment, Cancel, Product CRUD, Product seed, authentication, authorization, read API, delete API, or business database schema was implemented.

## Technical decisions made

- Node.js `24.21.0` LTS is pinned in `.nvmrc` and Docker. Node 24 was the current LTS line on the implementation date; the host's Node 23 runtime is EOL, so container results are authoritative.
- npm with `package-lock.json` provides deterministic package management. npm 11 was used because npm 10.9.2 crashed in Arborist while resolving the current dependency graph.
- Express 5 provides the HTTP foundation; Helmet provides lightweight security headers.
- Zod validates environment variables without including values in configuration errors.
- Pino provides structured logs and redacts password/authorization paths. No request/correlation ID infrastructure was added.
- Knex + MySQL2 provide a conventional query, migration, seed, and connection foundation for MySQL 8.x. No business migration was added in T-001.
- Vitest + Supertest provide unit and HTTP integration testing.
- ESLint flat config with `typescript-eslint` typed rules enforces strict TypeScript quality.
- No public health GET endpoint was added because TC-001.1 prohibits GET routes. The backend binds its port only after the database is reachable, and Docker checks that TCP port.
- Services/repositories were not created as empty abstractions. They will be introduced with concrete later-task workflows; T-001 contains only the useful route/controller and database boundaries.
- The Dockerfile has development, build, and non-root production stages. Compose uses the development stage so migration, seed, and test commands remain executable inside `backend`; the production stage installs production dependencies only.

## Files created / modified

Created:

- `.dockerignore`, `.env.example`, `.gitignore`, `.nvmrc`
- `Dockerfile`, `compose.yaml`, `README.md`
- `package.json`, `package-lock.json`
- `tsconfig.json`, `tsconfig.build.json`, `eslint.config.js`, `vitest.config.ts`
- `src/app.ts`, `src/server.ts`
- `src/config/environment.ts`
- `src/database/connection.ts`, `src/database/readiness.ts`, `src/database/runner-files.ts`, `src/database/migrate.ts`, `src/database/seed.ts`
- `src/http/controllers/pending-feature-controller.ts`
- `src/http/middleware/error-handler.ts`, `src/http/middleware/request-logger.ts`
- `src/http/routes/api-routes.ts`
- `src/infrastructure/logger.ts`
- `tests/unit/environment.test.ts`, `tests/unit/database-readiness.test.ts`
- `tests/integration/http-foundation.test.ts`

Modified:

- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/prompts/T-001-project-setup.md`

## Tests executed

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example config`
- `docker compose --env-file .env.example up --build -d`
- HTTP probes for all three POST routes and matching GET requests
- `docker compose --env-file .env.example exec -T backend sh -lc "node --version && npm --version && npm run typecheck && npm run lint && npm test && npm run build && npm run db:migrate && npm run db:seed"`
- Backend direct-start readiness test with MySQL stopped, followed by MySQL start and recovery verification
- `docker build --target production --tag test-coding-by-iconext-be:production .`
- Temporary production-image smoke run against the Compose MySQL network
- `npx --yes --cache .npm-cache npm@11.19.1 audit --omit=dev --cache .npm-cache`
- Dependency tree, no-`any`, scope, localhost DB-host, ignored-file, and secret-pattern scans; `git diff --check`
- Final post-documentation `typecheck`, `lint`, `test`, and `build` rerun
- Normalized Prompt #1 comparison against the original attachment (`ExactPromptMatch=True`)
- `docker compose --env-file .env.example down` after verification (containers/network removed; named MySQL volume preserved)

## Test results

Final results:

- Typecheck: PASS locally and in the Node `24.21.0` backend container.
- Lint: PASS locally and in the Node `24.21.0` backend container.
- Tests: PASS — 3 test files, 16 tests (5 unit, 11 integration) locally and in the backend container.
- Build: PASS locally, in the backend container, and in the production Docker build stage.
- Migration runner: PASS in the backend container; correctly reported that no T-002 migrations exist yet.
- Seed runner: PASS in the backend container; correctly reported that no T-003 seeds exist yet.
- Compose config: PASS — exactly `backend` and `mysql`; MySQL `8.4`; backend `DB_HOST=mysql`; health checks, network, and persistent volume present.
- Compose startup: PASS — both containers reached healthy state and the backend connected to MySQL.
- HTTP route verification: PASS — all three POST routes returned placeholder `501`; matching GET routes and Product management routes returned `404`; no authentication was required.
- Readiness failure/recovery: PASS — with MySQL stopped, the backend port remained closed and retries were logged; after MySQL started, database attempt 8 succeeded, the server bound its port, and both containers became healthy.
- Production image build: PASS. Production start smoke test connected to MySQL and started on port 3001; injected `SIGINT` produced a graceful shutdown (the interactive harness reported exit 1 because Ctrl+C was intentional).
- Production dependency audit: PASS — 0 vulnerabilities reported.
- Configuration/scope scans: PASS — no undocumented `any`, later-task business code, real `.env`, or container DB host using `localhost` was found. `127.0.0.1` appears only in same-container health checks.

Implementation-stage failures that were reproduced and fixed before final verification:

- Default npm cache was outside the writable workspace; a workspace-local ignored cache resolved the deterministic `EPERM`.
- TypeScript 7 exceeded `typescript-eslint`'s declared peer range; TypeScript `6.0.3` was selected after checking peer metadata.
- Host npm `10.9.2` crashed in Arborist; pinned npm 11 completed the same dependency resolution.
- Initial Pino exact-optional typing and ESLint scoping/code findings were corrected; the affected commands were rerun to PASS.

## Senior Review findings

Review completed at 2026-09-17 00:17:27 +07:00.

- HIGH: None.
- MEDIUM: None.
- LOW: None.

Review covered architecture, separation of concerns, TypeScript quality, configuration, Docker design, dependency choices, security baseline, logging, error handling foundation, maintainability, readability, unnecessary complexity, test quality, scope control, and checklist compliance.

## Fixes made after review

None required. No HIGH, MEDIUM, or LOW Senior Review findings were identified.

## Remaining LOW findings

None.

## Final Task status

DONE
