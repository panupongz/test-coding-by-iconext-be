# test-coding-by-iconext-be

Node.js, TypeScript, Express, and MySQL backend for the ICONEXT coding exercise. The Create Sale action is implemented; Payment and Cancel remain placeholders for their owning tasks.

## Prerequisites

- Docker with Docker Compose, or Node.js 24 LTS plus MySQL 8.x
- npm (the repository pins its expected version in `package.json`)

## Docker setup

The Compose application contains exactly two services: `backend` and `mysql`. The backend waits for MySQL before binding its HTTP port, and MySQL data is stored in the named `mysql_data` volume.

```sh
docker compose --env-file .env.example up --build -d
docker compose --env-file .env.example ps
```

Use `.env.example` only for isolated local evaluation. For normal development, copy it to an untracked `.env` and replace both example passwords.

```sh
docker compose up --build -d
```

Stop the containers without deleting the database volume:

```sh
docker compose down
```

## Development and quality commands

Install dependencies with `npm ci` after `package-lock.json` exists.

```sh
npm run dev
npm run build
npm start
npm run typecheck
npm run lint
npm test
npm run test:unit
npm run test:integration
```

The development command requires the variables shown in `.env.example` and an accessible MySQL server. Local processes may use another `DB_HOST`; inside Compose the host is always `mysql`.

## Database commands

The Knex migration creates `products`, `sales`, `payments`, and `idempotency_keys` with the required primary keys, foreign keys, unique indexes, enums, checks, integer-THB fields, and UTC-oriented timestamps. Run migration and seed commands inside the backend container:

```sh
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed
```

The seed command creates the canonical products `P001`–`P005`. Running it again with identical data is a no-op. If an existing canonical product code has different master data, the seed fails instead of overwriting that row.

Live database integration tests require both `NODE_ENV=test` and the explicit `DB_TEST_CONTEXT=disposable` safety flag. Database variables alone are not enough, so ordinary development and production databases skip these tests. Each test runs in a transaction that is rolled back and never deletes pre-existing rows by predictable identifiers.

Run the live suite against an isolated, disposable Compose project:

```sh
docker compose -p t002-test --env-file .env.example up -d mysql
docker compose -p t002-test --env-file .env.example run --build --rm -e NODE_ENV=test -e DB_TEST_CONTEXT=disposable backend npm test
docker compose -p t002-test --env-file .env.example down -v
```

The final command permanently removes only the `t002-test` project containers and temporary database volume.

The production image contains compiled runners:

```sh
npm run db:migrate:production
npm run db:seed:production
```

## API

The routes are registered without authentication. Create Sale is available:

```http
POST /api/v1/sales
Idempotency-Key: client-generated-key
Content-Type: application/json

{"product_code":"P001"}
```

A first success returns `201`; a successful retry with the same key and request returns the current Sale with `200`. The body contains only `sale_id`, `product_code`, `name`, `unit_price`, `quantity`, `total`, `status`, `created_at`, and `expires_at`. New Sales use `PENDING`, quantity `1`, the Product price captured at creation, and a five-minute expiry. A key used for a different request or an operation previously recorded as failed returns `409`.

The following registered actions still return `501 Not Implemented` until their owning tasks add approved behavior:

- `POST /api/v1/sales/:sale_id/payment`
- `POST /api/v1/sales/:sale_id/cancel`

There are no GET, DELETE, Product CRUD, login, role, or stock routes. Container health uses a TCP check rather than adding an unapproved HTTP route.

Create Sale follows route → controller → service → repository → MySQL. Its controller owns strict HTTP validation, while its service owns idempotency and transaction orchestration. Payment and Cancel still use the T-001 placeholder controller.
