import { Router } from "express";
import { validate } from "../../middlewares/validate";
import {
  simulateCpu,
  simulateError,
  simulateFlaky,
  simulateLatency,
  simulateLogs,
} from "./simulate.controller";
import {
  cpuQuerySchema,
  errorQuerySchema,
  flakyQuerySchema,
  latencyQuerySchema,
} from "./simulate.schema";

export const simulateRouter = Router();

simulateRouter.get("/latency", validate({ query: latencyQuerySchema }), simulateLatency);
simulateRouter.get("/error", validate({ query: errorQuerySchema }), simulateError);
simulateRouter.get("/flaky", validate({ query: flakyQuerySchema }), simulateFlaky);
simulateRouter.get("/cpu", validate({ query: cpuQuerySchema }), simulateCpu);
simulateRouter.get("/logs", simulateLogs);
