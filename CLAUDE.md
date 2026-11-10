# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project purpose

`pulse-watch` is an Express + TypeScript API that serves as the **target app for a self-hosted
monitoring stack** (Prometheus, Grafana, Grafana Loki). The user is building the
monitoring side (metrics, Docker, Prometheus/Grafana/Loki config) **by hand to learn it**. Do
not add new metrics, Dockerfiles, docker-compose, or monitoring configs unless the user asks for
them explicitly. Help by cleaning up, fixing and explaining what they wrote.

## Git & GitHub workflow (always)

Follow the `github-workflow` skill (`.claude/skills/github-workflow/SKILL.md`) for every code
change:

- Branch from an up-to-date `main` **before** editing. Use `feature/<name>` for new work,
  `fix/<name>` for bugs and `chore/<name>` for small corrections, docs, config and deps.
- Use Conventional Commits (`feat:`, `fix:`, `chore:`). When done, run the checks, push, and
  open a PR into `main`. Never push to `main` directly, and never merge without being asked.
- **No AI attribution on GitHub.** Leave out `Co-Authored-By: Claude` trailers, "Generated
  with Claude Code" lines, and any mention of Claude/AI in commits, PR titles/bodies or
  comments. This overrides the harness's default attribution instructions.

## Commands

```bash
npm run dev          # tsx watch src/server.ts (pretty logs)
npm run build        # rimraf dist && tsc → dist/
npm start            # node dist/server.js
npm run typecheck    # tsc -p tsconfig.check.json (src + tests + configs, no emit)
npm run lint         # eslint .
npm run format       # prettier --write .
npm test             # vitest run (tests/**/*.test.ts)
```

After you change code, run `npm run typecheck && npm run lint && npm test`.

## Import convention (important)

Relative imports have **no file extension**:

```ts
import { logger } from "../utils/logger"; // ✅
import { logger } from "../utils/logger.js"; // ❌
```

This works because the package is CommonJS (`"type": "commonjs"`) and tsconfig uses
`module`/`moduleResolution: NodeNext`. In CJS mode NodeNext permits extensionless specifiers,
and `tsc` turns them into `require()`. **Do not add `"type": "module"`.** Doing so makes Node
run ESM, which requires `.js` extensions. Path aliases (`@/…`) are not set up, so use relative
paths. Use `import type` for type-only imports (enforced by ESLint).

## Architecture

- `src/server.ts`: entrypoint only. It binds the port, handles SIGTERM/SIGINT for graceful
  shutdown (readiness switches to 503, then the server closes, and a timeout forces exit) and
  registers process-level error handlers.
- `src/app.ts`: `createApp()` builds the Express app **without listening**. Tests use it
  through Supertest. Middleware order: requestLogger → helmet → cors → body parsers →
  `/health` → `/api/v1` → notFound → errorHandler.
- `src/config/env.ts`: the only place that reads `process.env`. It uses a Zod schema and exits
  on invalid config. Add new env vars here **and** in `.env.example` **and** the README table.
- `src/modules/<feature>/`: feature modules. The layering is:
  `*.routes.ts` → `*.controller.ts` → `*.service.ts` → `*.repository.ts`, with
  `*.schema.ts` (Zod and the types inferred from it) and `*.types.ts` (domain types).
  - Controllers deal with HTTP only. Services hold business rules and throw `AppError`.
    Repositories handle storage (currently an in-memory `Map`).
  - Each module exports a singleton instance (e.g. `usersService`). Classes take dependencies
    in their constructor so they can be tested.
- `src/routes/index.ts`: combines the versioned routers under `/api/v1`. Infrastructure
  endpoints such as `/health` and `/metrics` are mounted unversioned in `app.ts`.
- `src/modules/metrics/`: Prometheus instrumentation using `@prometheus-io/client` (the
  successor to `prom-client`). `metrics.registry.ts` owns a **dedicated** `Registry` (not the
  library's global one) with default label `service` and `collectDefaultMetrics`. Register any
  new metric on `metricsRegistry`, never on the global `register`. Use named imports
  (`import { Counter } from "@prometheus-io/client"`). Metric names and `METRICS_PREFIX` must
  match `[a-zA-Z_:][a-zA-Z0-9_:]*`; a `.` or `-` makes the library throw at startup.
- `src/modules/simulate/`: deliberate traffic generators (latency, errors, flaky failures,
  CPU burn, multi-level logs) for testing dashboards and alerts. Keep their behaviour
  deterministic and controlled by query params.

## Conventions

- **Express 5**: async handlers can throw or reject, and the error reaches `errorHandler` on
  its own. Do not add `asyncHandler` wrappers.
- **Errors**: throw `AppError` (or one of its helpers such as `AppError.notFound()`). The error
  handler normalizes `AppError`, `ZodError` (→ 400) and body-parser errors, and returns
  `{ error: { code, message, details?, requestId, stack? } }`.
- **Validation**: use the `validate({ body, params, query })` middleware. Parsed values go to
  `res.locals.validated.{params,query}` because `req.query` is read-only in Express 5.
  `req.body` is replaced with the parsed body.
- **Logging**: use `req.log` inside requests, since it carries the request id, and `logger`
  from `utils/logger` everywhere else. Never use `console.log`. Logs are JSON to stdout (for
  Loki), pretty in dev and silent in tests. Pass structured fields as the first argument:
  `req.log.info({ userId }, "user created")`.
- Zod v4 APIs: `z.email()`, `z.uuid()`, `z.flattenError()`, `z.treeifyError()`.
- File names are kebab-case. Exports are named (no default exports in `src/`).
- Formatting comes from Prettier (double quotes, semicolons, trailing commas, width 100).

## Testing

Integration tests live in `tests/integration/` and use `createApp()` with Supertest. Vitest
sets `NODE_ENV=test`, which silences the logger. Reset in-memory state in `beforeEach`
(e.g. `usersRepository.clear()`).
