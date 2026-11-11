import { z } from "zod";

export const latencyQuerySchema = z.object({
  minMs: z.coerce.number().int().min(0).max(30_000).default(100),
  maxMs: z.coerce.number().int().min(0).max(30_000).default(1_000),
});

export const errorQuerySchema = z.object({
  status: z.coerce.number().int().min(400).max(599).default(500),
});

export const flakyQuerySchema = z.object({
  failureRate: z.coerce.number().min(0).max(1).default(0.3),
});

export const cpuQuerySchema = z.object({
  durationMs: z.coerce.number().int().min(1).max(10_000).default(500),
});

export type LatencyQuery = z.infer<typeof latencyQuerySchema>;
export type ErrorQuery = z.infer<typeof errorQuerySchema>;
export type FlakyQuery = z.infer<typeof flakyQuerySchema>;
export type CpuQuery = z.infer<typeof cpuQuerySchema>;

export const lateQuerySchema = z.object({
  ms: z.coerce.number().int().min(0).max(60_000).default(3_000),
});

export const timeoutQuerySchema = z.object({
  ms: z.coerce.number().int().min(0).max(60_000).default(5_000),
});

export const randomQuerySchema = z.object({
  errorRate: z.coerce.number().min(0).max(1).default(0.2),
  maxLatencyMs: z.coerce.number().int().min(0).max(10_000).default(500),
});

export type LateQuery = z.infer<typeof lateQuerySchema>;
export type TimeoutQuery = z.infer<typeof timeoutQuerySchema>;
export type RandomQuery = z.infer<typeof randomQuerySchema>;
