import { createApp } from "./app";
import { env } from "./config/env";
import { markShuttingDown } from "./modules/health/health.controller";
import { closeLogger, logger } from "./utils/logger";

const app = createApp();

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info({ host: env.HOST, port: env.PORT }, "server started");
});

let shuttingDown = false;

/** Flush buffered logs (e.g. the pending batch for Alloy) and then exit. */
const exitAfterFlush = (code: number): void => {
  void closeLogger().finally(() => process.exit(code));
};

const shutdown = (signal: NodeJS.Signals): void => {
  if (shuttingDown) return;
  shuttingDown = true;
  markShuttingDown();
  logger.info({ signal }, "shutdown signal received, draining connections");

  const forceExit = setTimeout(() => {
    logger.error("graceful shutdown timed out, forcing exit");
    exitAfterFlush(1);
  }, env.SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  server.close((err) => {
    if (err) {
      logger.error({ err }, "error while closing server");
      exitAfterFlush(1);
      return;
    }
    logger.info("server closed cleanly");
    exitAfterFlush(0);
  });
  server.closeIdleConnections();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception, exiting");
  exitAfterFlush(1);
});
