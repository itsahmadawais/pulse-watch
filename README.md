# pulse-watch

An Express + TypeScript service that serves as the **target application** for a self-built
observability stack (Prometheus, Grafana, Grafana Loki).

The app is a small, production-style REST API that also has **simulation endpoints**. You can
use them to generate latency, errors, CPU load and log volume on demand, so dashboards and
alerts have real signals to show.

> Status: the app, the `/metrics` endpoint and the local monitoring stack (Prometheus, Grafana,
> Loki, Alloy) are running. Custom HTTP metrics, dashboards and alerts are still to do.

## Tech stack

| Concern       | Choice                                            |
| ------------- | ------------------------------------------------- |
| Runtime       | Node.js 24                                        |
| Language      | TypeScript 6 (strict), compiled to CommonJS       |
| HTTP          | Express 5 (async errors handled natively)         |
| Validation    | Zod 4                                             |
| Logging       | Pino + pino-http, shipped via pino-loki → Alloy   |
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

| Variable                      | Default         | Description                                                           |
| ----------------------------- | --------------- | --------------------------------------------------------------------- |
| `NODE_ENV`                    | `development`   | `development` / `test` / `production`                                 |
| `APP_NAME`                    | `pulse-watch`   | Added as `service` to every log line                                  |
| `APP_VERSION`                 | package version | Added as `version` to every log line                                  |
| `HOST`                        | `0.0.0.0`       | Bind address                                                          |
| `PORT`                        | `3000`          | HTTP port                                                             |
| `LOG_LEVEL`                   | `info`          | `fatal` `error` `warn` `info` `debug` `trace` `silent`                |
| `CORS_ORIGIN`                 | `*`             | `*` or a comma-separated list of origins                              |
| `SHUTDOWN_TIMEOUT_MS`         | `10000`         | Graceful shutdown deadline before forced exit                         |
| `METRICS_PREFIX`              | _(empty)_       | Prefix for default metric names, e.g. `pulse_watch_`                  |
| `ALLOY_LOGS_URL`              | _(empty)_       | Alloy log receiver, e.g. `http://localhost:3500`; empty = stdout only |
| `ALLOY_LOGS_BATCH_INTERVAL_S` | `2`             | How often batched logs are pushed to Alloy (seconds)                  |

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

```
Node app (pino) ──► stdout (pretty in dev, JSON in prod)
        └── pino-loki ──HTTP push──► Alloy :3500 (loki.source.api → loki.process) ──► Loki :3100 ──► Grafana
```

- Both destinations run in pino worker threads, so log I/O doesn't block the event loop.
  Shipping to Alloy is turned on by setting `ALLOY_LOGS_URL`. Logs are batched every
  `ALLOY_LOGS_BATCH_INTERVAL_S` seconds and flushed on graceful shutdown. If Alloy is down,
  the push fails silently and stdout keeps working.
- **Loki labels** (indexed, low-cardinality): `service`, `env`, `level`, `collector`.
- **Structured metadata** (added by Alloy, queryable but not indexed): `request_id`, `method`,
  `status_code`.
- Every JSON line includes `service`, `version` and `env`, a numeric `level` (30 = info,
  40 = warn, 50 = error) and `time` in epoch milliseconds. pino-loki needs this format.
- Each request gets an id (the incoming `x-request-id` is reused if present). The id is sent back
  in the `x-request-id` header and appears in the logs as `req.id`.
- One access log line is written per request. Its level depends on the status code: `info` below
  400, `warn` for 4xx, `error` for 5xx. Requests to `/health/*` and `/metrics` are not logged.

Example LogQL queries in Grafana → Explore → Loki:

```logql
{service="pulse-watch", level="error"}
{service="pulse-watch"} | request_id="<x-request-id value>"
{service="pulse-watch"} | json | res_statusCode >= 500
sum by (level) (count_over_time({service="pulse-watch"}[5m]))
```

### Running the monitoring stack

```bash
docker compose up -d       # Prometheus :9090, Grafana :3001, Loki :3100, Alloy UI :12345
npm run dev                # with ALLOY_LOGS_URL=http://localhost:3500 in .env
```

In Grafana, add a Loki data source with URL `http://loki:3100`.

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
monitoring/
├── prometheus/            # prometheus.yaml (scrape config), alerts.yaml
├── loki/                  # loki-config.yaml
└── alloy/                 # config.alloy (log pipeline: receive → process → write)
```

## Roadmap (monitoring work)

- [x] `/metrics` endpoint with default Node.js metrics
- [ ] Custom HTTP metrics (request count / duration histogram)
- [x] docker-compose: Prometheus, Grafana, Loki, Alloy
- [x] Log shipping: pino-loki → Alloy → Loki
- [ ] Dockerfile for the app
- [ ] Grafana dashboards: RED metrics, Node.js runtime, logs
- [ ] Alerting rules
