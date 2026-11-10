import { Router } from "express";
import { info, liveness, readiness } from "./health.controller";

export const healthRouter = Router();

healthRouter.get("/", info);
healthRouter.get("/live", liveness);
healthRouter.get("/ready", readiness);
