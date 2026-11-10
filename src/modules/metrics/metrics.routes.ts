import { Router } from "express";
import { getMetrics } from "./metrics.controller";

export const metricsRouter = Router();

metricsRouter.get("/", getMetrics);
