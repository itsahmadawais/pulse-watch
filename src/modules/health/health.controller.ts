import type { Request, Response } from "express";
import { env } from "../../config/env";

let isShuttingDown = false;

export const markShuttingDown = (): void => {
  isShuttingDown = true;
};

/** Liveness: the process is up and the event loop responds. */
export const liveness = (_req: Request, res: Response): void => {
  res.status(200).json({ status: "ok" });
};

/** Readiness: the instance can accept traffic (false while draining on shutdown). */
export const readiness = (_req: Request, res: Response): void => {
  if (isShuttingDown) {
    res.status(503).json({ status: "shutting_down" });
    return;
  }
  res.status(200).json({ status: "ready" });
};

/** General info useful when debugging a running instance. */
export const info = (_req: Request, res: Response): void => {
  const memory = process.memoryUsage();
  res.status(200).json({
    service: env.APP_NAME,
    env: env.NODE_ENV,
    version: env.APP_VERSION,
    node: process.version,
    pid: process.pid,
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: {
      rss: +(memory.rss / 1024 / 1024).toFixed(1),
      heapUsed: +(memory.heapUsed / 1024 / 1024).toFixed(1),
    },
    timestamp: new Date().toISOString(),
  });
};
