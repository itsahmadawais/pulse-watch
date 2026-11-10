# pulse-watch

An Express + TypeScript service that serves as the **target application** for a self-built
observability stack (Prometheus, Grafana, Grafana Loki).

The app is a small, production-style REST API that also has **simulation endpoints**. You can
use them to generate latency, errors, CPU load and log volume on demand, so dashboards and
alerts have real signals to show.

> Status: the application baseline and the `/metrics` endpoint (default Node.js metrics) are done.
> Custom HTTP metrics, the monitoring stack and Docker are not set up yet.

## Tech stack

| Concern       | Choice                                            |
| ------------- | ------------------------------------------------- |
| Runtime       | Node.js 24                                        |
| Language      | TypeScript 6 (strict), compiled to CommonJS       |
| HTTP          | Express 5 (async errors handled natively)         |
| Validation    | Zod 4                                             |
| Logging       | Pino (JSON to stdout) + pino-http access logs     |
| Metrics       | @prometheus-io/client (dedicated registry)        |
| Security      | helmet, cors                                      |
| Testing       | Vitest + Supertest                                |
| Lint / format | ESLint (flat config, typescript-eslint), Prettier |

## Getting started

```bash
npm install
cp .env.example .env     # adjust if needed
npm run dev              # tsx watch mode, pretty logs
```

The server listens on `http://localhost:3000` by default.

### Scripts

| Script              | What it does                                            |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Run from source with hot reload (`tsx watch`)           |
| `npm run build`     | Clean and compile to `dist/`                            |
| `npm start`         | Run the compiled build (`node dist/server.js`)          |
| `npm run typecheck` | Type-check `src`, `tests` and config files without emit |
| `npm run lint`      | ESLint                                                  |
| `npm run format`    | Prettier write                                          |
| `npm test`          | Run the test suite once                                 |

## Configuration

Settings come from environment variables (loaded from `.env` by `dotenv`) and are checked at
startup by `src/config/env.ts`. If any value is invalid, the process exits immediately.

| Variable              | Default         | Description                                            |
| --------------------- | --------------- | ------------------------------------------------------ |
| `NODE_ENV`            | `development`   | `development` / `test` / `production`                  |
| `APP_NAME`            | `pulse-watch`   | Added as `service` to every log line                   |
| `APP_VERSION`         | package version | Added as `version` to every log line                   |
| `HOST`                | `0.0.0.0`       | Bind address                                           |
| `PORT`                | `3000`          | HTTP port                                              |
| `LOG_LEVEL`           | `info`          | `fatal` `error` `warn` `info` `debug` `trace` `silent` |
| `CORS_ORIGIN`         | `*`             | `*` or a comma-separated list of origins               |
| `SHUTDOWN_TIMEOUT_MS` | `10000`         | Graceful shutdown deadline before forced exit          |
| `METRICS_PREFIX`      | _(empty)_       | Prefix for default metric names, e.g. `pulse_watch_`   |

## API

### Health (unversioned, infrastructure)

| Method | Path            | Description                                         |
| ------ | --------------- | --------------------------------------------------- |
| GET    | `/`             | Service index: name, version, main endpoints        |
| GET    | `/health`       | Instance info: version, uptime, memory              |
| GET    | `/health/live`  | Liveness probe                                      |
| GET    | `/health/ready` | Readiness probe (returns `503` while shutting down) |
| GET    | `/metrics`      | Prometheus scrape endpoint                          |

### Users: `/api/v1/users` (in-memory CRUD)

| Method | Path   | Body / Query                          |
| ------ | ------ | ------------------------------------- |
| GET    | `/`    | `?limit=20&offset=0`                  |
| POST   | `/`    | `{ "name": string, "email": string }` |
| GET    | `/:id` | –                                     |
| PATCH  | `/:id` | partial `{ name?, email? }`           |
| DELETE | `/:id` | –                                     |

### Simulation: `/api/v1/simulate` (traffic generators for monitoring)

| Method | Path       | Query params                 | Effect                              |
| ------ | ---------- | ---------------------------- | ----------------------------------- |
| GET    | `/latency` | `minMs=100&maxMs=1000`       | Responds after a random delay       |
| GET    | `/error`   | `status=500` (400–599)       | Always fails with the given status  |
| GET    | `/flaky`   | `failureRate=0.3` (0–1)      | Fails with 500 at the given rate    |
| GET    | `/cpu`     | `durationMs=500` (max 10000) | Busy-loops, blocking the event loop |
| GET    | `/logs`    | –                            | Writes one log line at each level   |

### Error format

Every error has the same shape:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User 3f0c... not found",
    "details": {},
    "requestId": "b6f1c1d2-..."
  }
}
```

`stack` is included for 5xx errors, except when `NODE_ENV=production`.

## Logging

- Logs are written to stdout, one JSON object per line. `pino-pretty` formats them only in
  development.
- Every line includes `service`, `version`, `env`, `level` (as a string) and an ISO `time`.
- Each request gets an id (the incoming `x-request-id` is reused if present). The id is sent back
  in the `x-request-id` header and appears in the logs as `req.id`.
- One access log line is written per request. Its level depends on the status code: `info` below
  400, `warn` for 4xx, `error` for 5xx. Requests to `/health/*` and `/metrics` are not logged.

With this format, Loki can parse the logs using `| json` and filter by `level`, `service` or
`req.id`.

## Project structure

```
src/
├── server.ts              # Entrypoint: listen, graceful shutdown, process handlers
├── app.ts                 # createApp(): middleware + routes (no port binding)
├── config/
│   └── env.ts             # Zod-validated environment
├── routes/
│   └── index.ts           # /api/v1 router aggregation
├── modules/               # Feature modules
│   ├── health/            # routes + controller
│   ├── metrics/           # Prometheus registry + /metrics endpoint
│   ├── users/             # routes → controller → service → repository (+ schema, types)
│   └── simulate/          # latency / error / cpu / log generators
├── middlewares/           # request-logger, validate, not-found, error-handler
└── utils/                 # logger, AppError, sleep
tests/
└── integration/           # Supertest against createApp()
```

## Roadmap (monitoring work)

- [x] `/metrics` endpoint with default Node.js metrics
- [ ] Custom HTTP metrics (request count / duration histogram)
- [ ] Dockerfile + docker-compose (app, Prometheus, Grafana, Loki, log shipper)
- [ ] Grafana dashboards: RED metrics, Node.js runtime, logs
- [ ] Alerting rules
