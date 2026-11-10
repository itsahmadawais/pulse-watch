import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodType } from "zod";

interface RequestSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Validates request parts against zod schemas. Parsed (coerced) values are
 * stored on `res.locals.validated` because `req.query` is read-only in Express 5.
 * Validation errors are forwarded to the global error handler.
 */
export const validate =
  (schemas: RequestSchemas): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    const validated: Record<string, unknown> = {};
    if (schemas.params) validated.params = schemas.params.parse(req.params);
    if (schemas.query) validated.query = schemas.query.parse(req.query);
    if (schemas.body) {
      validated.body = schemas.body.parse(req.body);
      req.body = validated.body;
    }
    res.locals.validated = validated;
    next();
  };
