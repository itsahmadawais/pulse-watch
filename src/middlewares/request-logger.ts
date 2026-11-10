import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { pinoHttp } from "pino-http";
import { logger } from "../utils/logger";

const REQUEST_ID_HEADER = "x-request-id";
const QUIET_PATHS = /^\/(health|metrics)(\/|\?|$)/;

/**
 * Attaches a request id (reuses incoming `x-request-id` if present), echoes it
 * back in the response, and emits one structured log line per completed request.
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage, res: ServerResponse) => {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const id = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
    res.setHeader(REQUEST_ID_HEADER, id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req: (req: { id: string; method: string; url: string }) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
  // Keep health probes and Prometheus scrapes out of the logs to avoid noise.
  autoLogging: {
    ignore: (req) => QUIET_PATHS.test(req.url ?? ""),
  },
});
