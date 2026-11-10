import pino from "pino";
import { env, isProduction, isTest } from "../config/env";

/**
 * Structured JSON logger (one JSON object per line on stdout).
 * In development the output is pretty-printed; in production it stays raw JSON
 * so a log shipper (e.g. Promtail / Grafana Alloy -> Loki) can parse it.
 */
export const logger = pino({
  name: env.APP_NAME,
  level: isTest ? "silent" : env.LOG_LEVEL,
  base: { service: env.APP_NAME, version: env.APP_VERSION, env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    censor: "[REDACTED]",
  },
  ...(isProduction || isTest
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
        },
      }),
});
