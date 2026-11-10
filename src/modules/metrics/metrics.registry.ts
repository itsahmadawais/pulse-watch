import { collectDefaultMetrics, Registry } from "@prometheus-io/client";
import { env } from "../../config/env";

/**
 * Dedicated registry (instead of the library's global one) so only metrics
 * registered here are exposed, and tests/modules can't leak into it by accident.
 */
export const metricsRegistry = new Registry();

// Attached to every series, so dashboards can filter by service.
metricsRegistry.setDefaultLabels({ service: env.APP_NAME });

// Node.js runtime + process metrics (CPU, memory, event loop lag, GC, handles...).
collectDefaultMetrics({ register: metricsRegistry, prefix: env.METRICS_PREFIX });
