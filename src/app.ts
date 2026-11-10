import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/error-handler";
import { notFoundHandler } from "./middlewares/not-found";
import { requestLogger } from "./middlewares/request-logger";
import { healthRouter } from "./modules/health/health.routes";
import { metricsRouter } from "./modules/metrics/metrics.routes";
import { apiRouter } from "./routes";

/**
 * Builds the Express application without binding a port, so it can be
 * reused by tests (supertest) and by the server entrypoint.
 */
export const createApp = (): Express => {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.use(requestLogger);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",") }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Root: small index so hitting the base URL isn't a 404.
  app.get("/", (_req, res) => {
    res.status(200).json({
      service: env.APP_NAME,
      version: env.APP_VERSION,
      endpoints: {
        health: "/health",
        metrics: "/metrics",
        users: "/api/v1/users",
        simulate: "/api/v1/simulate/{latency|error|flaky|cpu|logs}",
      },
    });
  });

  // Infrastructure endpoints (unversioned).
  app.use("/health", healthRouter);
  app.use("/metrics", metricsRouter);

  // Business API
  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
