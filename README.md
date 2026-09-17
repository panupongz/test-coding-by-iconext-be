# test-coding-by-iconext-be

Node.js, TypeScript, Express, and MySQL backend for the ICONEXT coding exercise.
It exposes Create Sale, Payment, and Cancel actions under `/api/v1`.

The complete HTTP contract, examples, lifecycle, idempotency rules, and error
catalog are in [docs/API.md](docs/API.md).

## Prerequisites

- Docker Engine with Docker Compose v2
- Git
- Node.js `24.21.x` and npm `11.19.x` only when running quality commands on
  the host (the Docker workflow does not require host Node.js)

## Clean-checkout Docker setup

Compose defines exactly two services: `backend` and `mysql`. Create a local
environment file from the committed safe template, then replace both example
passwords with local-only values. `.env` is ignored by Git and must not be
committed.

```sh
cp .env.example .env
```

PowerShell equivalent:

```powershell
Copy-Item .env.example .env
```

Validate the resolved Compose configuration and build the backend image:

```sh
docker compose config
docker compose build backend
```

Start MySQL first, run migrations and the canonical seed in one-off backend
containers, and only then start the HTTP service:

```sh
docker compose up -d mysql
docker compose run --rm backend npm run db:migrate
docker compose run --rm backend npm run db:seed
docker compose up -d backend
docker compose ps
```

The API is available at `http://localhost:${PORT:-3000}` (port `3000` with the
provided template). Useful operating commands are:

```sh
docker compose logs -f backend mysql
docker compose restart backend
docker compose stop
docker compose start
docker compose down
```

`docker compose down` removes the containers and network but preserves the
named `mysql_data` volume. Consequently, database data survives normal
container recreation. To intentionally delete local database data, use
`docker compose down -v`; this is destructive and is not part of the normal
shutdown workflow.

MySQL users and passwords are initialized in that volume. Keep the database
credentials in `.env` stable while reusing it. If credentials must change for
a disposable environment, remove that environment's volume first; never
delete a volume containing data that must be retained.

### Database readiness

MySQL has a Compose healthcheck. The backend depends on that healthy state and
also retries its own database connection before opening the HTTP listener. In
Compose, the backend database host is always the service name `mysql`, never
`localhost`. Connection details are supplied only through environment
variables.

The readiness checks establish database connectivity; they do not apply the
schema. Run migration and seed before starting the backend on a clean volume,
as shown above.

## Database migration and seed

For an already-running Compose application, execute database commands inside
the backend container:

```sh
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed
```

The seed is idempotent when the canonical data already matches. It inserts
only missing rows and fails rather than overwriting a canonical product whose
stored master data differs.

| Code | Name | Description | Image | Price (THB) |
| --- | --- | --- | --- | ---: |
| `P001` | Iced Americano | Espresso with chilled water and ice | `/products/P001.jpg` | 60 |
| `P002` | Thai Milk Tea | Thai tea with milk served over ice | `/products/P002.jpg` | 55 |
| `P003` | Butter Croissant | Flaky butter croissant | `/products/P003.jpg` | 65 |
| `P004` | Ham Cheese Sandwich | Sandwich with ham and cheese | `/products/P004.jpg` | 75 |
| `P005` | Drinking Water | Bottled drinking water | `/products/P005.jpg` | 15 |

These are exactly the five canonical seed rows. Prices are integer THB and
images are relative paths. Product `deleted_at` is `NULL` after seeding.

## Validation and tests

Run the fast project checks inside the running backend container:

```sh
docker compose exec backend npm run typecheck
docker compose exec backend npm run lint
docker compose exec backend npm run test:unit
```

Database integration tests require both `NODE_ENV=test` and
`DB_TEST_CONTEXT=disposable`. They deliberately refuse to run against an
ordinary development or production database. The repository's end-to-end
Docker verifier creates an isolated Compose project and volume, validates
Compose configuration/build/readiness/networking/persistence, runs migration
and seed commands in backend containers, runs the full test suite in a backend
container, and removes its temporary resources:

```sh
npm run test:docker
```

To execute the same database workflow manually with an isolated project:

`iconext-review` must be a disposable, unused Compose project name. If that
name already exists, substitute another unused name consistently in all five
commands.

```sh
docker compose -p iconext-review --env-file .env up -d mysql
docker compose -p iconext-review --env-file .env run --build --rm backend npm run db:migrate
docker compose -p iconext-review --env-file .env run --rm backend npm run db:seed
docker compose -p iconext-review --env-file .env run --rm -e NODE_ENV=test -e DB_TEST_CONTEXT=disposable backend npm test
docker compose -p iconext-review --env-file .env down -v --remove-orphans
```

The final command deletes only the disposable `iconext-review` containers,
network, and volume; it does not delete the built image. Do not set
`DB_TEST_CONTEXT=disposable` for a database whose data must be retained.

When using the pinned host toolchain, the equivalent non-container commands
are:

```sh
npm ci
npm run typecheck
npm run lint
npm run build
npm run test:unit
```

Host integration tests run only when explicitly connected to a disposable
MySQL context. `npm run dev` loads the environment variables in `.env`; a host
process may use another `DB_HOST`, while Compose always overrides it to
`mysql`.

## Production image commands

The production Docker stage contains compiled application and database
runners:

```sh
npm run db:migrate:production
npm run db:seed:production
npm start
```

Supply the same validated environment variables shown in `.env.example` from
the deployment environment. Do not bake credentials into an image or commit
them to the repository.

## Architecture and persistence

HTTP requests follow route → controller → service → repository → MySQL.
Controllers handle HTTP validation; services own business state,
idempotency, locking, and transaction orchestration; repositories own SQL and
persistence.

Critical writes use short transactions at MySQL's configured default
isolation level. Payment and Cancel lock their Sale row, and unique and foreign
key constraints remain the final integrity guards. A successful business
write and its successful idempotency record commit atomically. A failed
business transaction is rolled back before its terminal failed idempotency
record is persisted in a separate transaction.
