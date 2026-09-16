# test-coding-by-iconext-be

Node.js, TypeScript, Express, and MySQL backend foundation for the ICONEXT coding exercise. T-001 intentionally exposes only the three approved action-route placeholders; their business behavior belongs to later tasks.

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

No business tables, migrations, or product seed data are part of T-001. The migration and seed runners are ready for later task files and are executable inside the backend container:

```sh
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed
```

The production image contains compiled runners:

```sh
npm run db:migrate:production
npm run db:seed:production
```

## API foundation

The following routes are registered without authentication and return `501 Not Implemented` until their owning tasks add approved behavior:

- `POST /api/v1/sales`
- `POST /api/v1/sales/:sale_id/payment`
- `POST /api/v1/sales/:sale_id/cancel`

There are no GET, DELETE, Product CRUD, login, role, or stock routes. Container health uses a TCP check rather than adding an unapproved HTTP route.

The current concrete flow is route → HTTP-only placeholder controller, with database connection and runner boundaries under `src/database`. Services and repositories will be introduced only when later tasks add concrete business operations; T-001 does not add empty abstractions merely to mirror the future dependency diagram.
