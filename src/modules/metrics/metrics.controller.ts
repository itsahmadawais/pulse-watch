import type { Request, Response } from "express";
import { metricsRegistry } from "./metrics.registry";

/** Prometheus scrape endpoint (text exposition format). */
export const getMetrics = async (_req: Request, res: Response): Promise<void> => {
  res.setHeader("Content-Type", metricsRegistry.contentType);
  res.status(200).send(await metricsRegistry.metrics());
};
