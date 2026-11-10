import type { Request, Response, NextFunction } from "express";
import { ZodError, z } from "zod";
import { isProduction } from "../config/env";
import { AppError } from "../utils/app-error";

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
    stack?: string;
  };
}

const normalize = (err: unknown): AppError => {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) {
    return AppError.badRequest("Validation failed", z.flattenError(err));
  }
  // body-parser errors (malformed JSON, payload too large) carry a `status`.
  if (
    err instanceof Error &&
    "status" in err &&
    typeof err.status === "number" &&
    err.status < 500
  ) {
    return new AppError(err.status, err.message, { code: "BAD_REQUEST" });
  }
  return AppError.internal();
};

// Express identifies error handlers by arity, so all 4 params must be declared.
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const appError = normalize(err);

  if (appError.statusCode >= 500) {
    req.log.error({ err }, appError.message);
  } else {
    req.log.warn({ code: appError.code, details: appError.details }, appError.message);
  }

  const body: ErrorBody = {
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
      requestId: String(req.id),
      // Stack traces only help for unexpected (5xx) failures; skip them for 4xx noise.
      ...(!isProduction && appError.statusCode >= 500 && err instanceof Error
        ? { stack: err.stack }
        : {}),
    },
  };

  res.status(appError.statusCode).json(body);
};
