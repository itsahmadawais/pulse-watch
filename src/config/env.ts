import { config } from "dotenv";
import { z } from "zod";

config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().min(1).default("pulse-watch"),
  APP_VERSION: z
    .string()
    .min(1)
    .default(process.env.npm_package_version ?? "0.0.0-dev"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  CORS_ORIGIN: z.string().default("*"),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  // Optional prefix for default metric names, e.g. "pulse_watch_". Must be a valid
  // Prometheus name fragment (letters, digits, underscores; no dots or dashes).
  METRICS_PREFIX: z
    .string()
    .regex(/^([a-zA-Z_][a-zA-Z0-9_]*)?$/, "must match [a-zA-Z_][a-zA-Z0-9_]*")
    .default(""),
  // Base URL of the Grafana Alloy `loki.source.api` receiver (e.g. http://localhost:3500).
  // Empty/unset disables shipping logs; they still go to stdout.
  ALLOY_LOGS_URL: z
    .union([z.literal(""), z.url()])
    .optional()
    .transform((value) => value || undefined),
  ALLOY_LOGS_BATCH_INTERVAL_S: z.coerce.number().positive().default(2),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Logger depends on env, so fall back to console here.
  console.error("Invalid environment configuration:", z.treeifyError(parsed.error));
  process.exit(1);
}

export const env: Env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
