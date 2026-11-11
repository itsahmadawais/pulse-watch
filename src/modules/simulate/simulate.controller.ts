import type { Request, RequestHandler, Response } from "express";
import { AppError } from "../../utils/app-error";
import { sleep } from "../../utils/sleep";
import { errorScenarioNames, errorScenarios, type ErrorScenario } from "./simulate.scenarios";
import type {
  CpuQuery,
  ErrorQuery,
  FlakyQuery,
  LateQuery,
  LatencyQuery,
  RandomQuery,
  TimeoutQuery,
} from "./simulate.schema";

/*
 * Traffic generators for exercising the monitoring stack: they produce
 * predictable latency, error rates, CPU load and log volume on demand.
 */

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const simulateLatency = async (req: Request, res: Response): Promise<void> => {
  const { minMs, maxMs } = res.locals.validated.query as LatencyQuery;
  const delay = randomBetween(minMs, Math.max(minMs, maxMs));
  await sleep(delay);
  req.log.debug({ delay }, "simulated latency");
  res.status(200).json({ delayMs: delay });
};

export const simulateError = (_req: Request, res: Response): void => {
  const { status } = res.locals.validated.query as ErrorQuery;
  throw new AppError(status, `Simulated ${status} error`, {
    code: "SIMULATED_ERROR",
    isOperational: status < 500,
  });
};

export const simulateFlaky = (_req: Request, res: Response): void => {
  const { failureRate } = res.locals.validated.query as FlakyQuery;
  if (Math.random() < failureRate) {
    throw new AppError(500, "Simulated flaky failure", { code: "FLAKY_FAILURE" });
  }
  res.status(200).json({ ok: true, failureRate });
};

export const simulateCpu = (req: Request, res: Response): void => {
  const { durationMs } = res.locals.validated.query as CpuQuery;
  const end = Date.now() + durationMs;
  let iterations = 0;
  // Intentionally blocks the event loop.
  while (Date.now() < end) {
    Math.sqrt(Math.random() * Number.MAX_SAFE_INTEGER);
    iterations++;
  }
  req.log.warn({ durationMs, iterations }, "simulated CPU burn");
  res.status(200).json({ durationMs, iterations });
};

/** Responds successfully, but only after a fixed delay. */
export const simulateLate = async (req: Request, res: Response): Promise<void> => {
  const { ms } = res.locals.validated.query as LateQuery;
  await sleep(ms);
  req.log.info({ delayMs: ms }, "late response sent");
  res.status(200).json({ ok: true, delayMs: ms });
};

/** Waits like a slow upstream, then gives up with 504 Gateway Timeout. */
export const simulateTimeout = async (_req: Request, res: Response): Promise<void> => {
  const { ms } = res.locals.validated.query as TimeoutQuery;
  await sleep(ms);
  throw AppError.gatewayTimeout(`Upstream inventory service did not respond within ${ms}ms`);
};

/** Builds a handler that always fails with the given scenario. */
export const simulateScenario =
  (scenario: ErrorScenario): RequestHandler =>
  () => {
    throw errorScenarios[scenario]();
  };

/** Realistic traffic mix: random latency, then success or a random error scenario. */
export const simulateRandom = async (req: Request, res: Response): Promise<void> => {
  const { errorRate, maxLatencyMs } = res.locals.validated.query as RandomQuery;
  const latencyMs = randomBetween(0, maxLatencyMs);
  await sleep(latencyMs);

  if (Math.random() < errorRate) {
    const scenario = errorScenarioNames[randomBetween(0, errorScenarioNames.length - 1)]!;
    req.log.debug({ scenario }, "random scenario picked");
    throw errorScenarios[scenario]();
  }

  res.status(200).json({ ok: true, latencyMs });
};

/** Lists every simulation endpoint, so it's easy to see what's available. */
export const simulateIndex = (_req: Request, res: Response): void => {
  const base = "/api/v1/simulate";
  res.status(200).json({
    latency: {
      latency: `${base}/latency?minMs=100&maxMs=1000`,
      late: `${base}/late?ms=3000`,
      timeout: `${base}/timeout?ms=5000`,
    },
    errors: {
      ...Object.fromEntries(errorScenarioNames.map((name) => [name, `${base}/${name}`])),
      custom: `${base}/error?status=500`,
      flaky: `${base}/flaky?failureRate=0.3`,
    },
    mixed: { random: `${base}/random?errorRate=0.2&maxLatencyMs=500` },
    load: { cpu: `${base}/cpu?durationMs=500`, logs: `${base}/logs` },
  });
};

export const simulateLogs = (req: Request, res: Response): void => {
  req.log.debug({ source: "simulate" }, "debug message");
  req.log.info({ source: "simulate", userAction: "checkout" }, "info message");
  req.log.warn({ source: "simulate", retry: 2 }, "warn message");
  req.log.error({ source: "simulate", err: new Error("example failure") }, "error message");
  res.status(200).json({ emitted: ["debug", "info", "warn", "error"] });
};
