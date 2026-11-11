import pino, { type LoggerOptions, type TransportTargetOptions } from "pino";
import type { LokiOptions } from "pino-loki";
import { env, isProduction, isTest } from "../config/env";

/**
 * Structured logger with two destinations, each running in a pino worker thread:
 *
 * 1. stdout: pretty-printed in development, raw JSON in production.
 * 2. Grafana Alloy (when ALLOY_LOGS_URL is set): logs are pushed in batches to
 *    Alloy's `loki.source.api` receiver, and Alloy processes and forwards them to Loki.
 *
 * pino doesn't allow a custom `formatters.level` with multiple transport targets,
 * so `level` stays numeric in the JSON (30 = info, 40 = warn, 50 = error...).
 * pino-loki maps it to a readable `level` label in Loki.
 */

const stdoutTarget = (): TransportTargetOptions =>
  isProduction
    ? { target: "pino/file", level: env.LOG_LEVEL, options: { destination: 1 } }
    : {
        target: "pino-pretty",
        level: env.LOG_LEVEL,
        options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
      };

const alloyTarget = (host: string): TransportTargetOptions<LokiOptions> => ({
  target: "pino-loki",
  level: env.LOG_LEVEL,
  options: {
    host,
    // Low-cardinality stream labels only. Per-request values (req.id, etc.) stay in
    // the log line, and Alloy promotes some of them to structured metadata.
    labels: { service: env.APP_NAME, env: env.NODE_ENV },
    batching: { interval: env.ALLOY_LOGS_BATCH_INTERVAL_S },
    // Don't crash or spam stderr if Alloy is down; logs still reach stdout.
    silenceErrors: true,
  },
});

const baseOptions: LoggerOptions = {
  name: env.APP_NAME,
  level: isTest ? "silent" : env.LOG_LEVEL,
  base: { service: env.APP_NAME, version: env.APP_VERSION, env: env.NODE_ENV },
  // Keep pino's default epoch-ms `time`: pino-loki uses it as the Loki entry timestamp,
  // and an ISO string would be pushed as "NaN" and rejected.
  timestamp: pino.stdTimeFunctions.epochTime,
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    censor: "[REDACTED]",
  },
};

// Tests: no worker threads, no network, nothing printed.
const transport = isTest
  ? undefined
  : pino.transport({
      targets: [stdoutTarget(), ...(env.ALLOY_LOGS_URL ? [alloyTarget(env.ALLOY_LOGS_URL)] : [])],
    });

export const logger = transport ? pino(baseOptions, transport) : pino(baseOptions);

/**
 * Ends the transport and waits for the workers to flush, including pino-loki's pending
 * batch, before the process exits. Call it during graceful shutdown.
 */
export const closeLogger = (timeoutMs = 3_000): Promise<void> =>
  new Promise((resolve) => {
    if (!transport) return resolve();
    const timer = setTimeout(resolve, timeoutMs);
    transport.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
    transport.end();
  });
