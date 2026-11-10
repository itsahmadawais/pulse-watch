import type { Request, Response } from "express";
import { AppError } from "../../utils/app-error";
import { sleep } from "../../utils/sleep";
import type { CpuQuery, ErrorQuery, FlakyQuery, LatencyQuery } from "./simulate.schema";

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

export const simulateLogs = (req: Request, res: Response): void => {
  req.log.debug({ source: "simulate" }, "debug message");
  req.log.info({ source: "simulate", userAction: "checkout" }, "info message");
  req.log.warn({ source: "simulate", retry: 2 }, "warn message");
  req.log.error({ source: "simulate", err: new Error("example failure") }, "error message");
  res.status(200).json({ emitted: ["debug", "info", "warn", "error"] });
};
