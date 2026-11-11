import { Router } from "express";
import { validate } from "../../middlewares/validate";
import {
  simulateCpu,
  simulateError,
  simulateFlaky,
  simulateIndex,
  simulateLate,
  simulateLatency,
  simulateLogs,
  simulateRandom,
  simulateScenario,
  simulateTimeout,
} from "./simulate.controller";
import { errorScenarioNames } from "./simulate.scenarios";
import {
  cpuQuerySchema,
  errorQuerySchema,
  flakyQuerySchema,
  lateQuerySchema,
  latencyQuerySchema,
  randomQuerySchema,
  timeoutQuerySchema,
} from "./simulate.schema";

export const simulateRouter = Router();

simulateRouter.get("/", simulateIndex);

// Slow responses
simulateRouter.get("/latency", validate({ query: latencyQuerySchema }), simulateLatency);
simulateRouter.get("/late", validate({ query: lateQuerySchema }), simulateLate);
simulateRouter.get("/timeout", validate({ query: timeoutQuerySchema }), simulateTimeout);

// Errors
simulateRouter.get("/error", validate({ query: errorQuerySchema }), simulateError);
simulateRouter.get("/flaky", validate({ query: flakyQuerySchema }), simulateFlaky);
// One explicit route per scenario (not `/:type`), so each one shows up as its own route.
for (const name of errorScenarioNames) {
  simulateRouter.get(`/${name}`, simulateScenario(name));
}

// Mixed traffic and load
simulateRouter.get("/random", validate({ query: randomQuerySchema }), simulateRandom);
simulateRouter.get("/cpu", validate({ query: cpuQuerySchema }), simulateCpu);
simulateRouter.get("/logs", simulateLogs);
