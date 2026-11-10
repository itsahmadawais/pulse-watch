import { Router } from "express";
import { simulateRouter } from "../modules/simulate/simulate.routes";
import { usersRouter } from "../modules/users/users.routes";

/** Versioned business API, mounted at /api/v1. */
export const apiRouter = Router();

apiRouter.use("/users", usersRouter);
apiRouter.use("/simulate", simulateRouter);
