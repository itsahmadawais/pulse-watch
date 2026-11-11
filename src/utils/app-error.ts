export interface AppErrorOptions {
  code?: string;
  details?: unknown;
  isOperational?: boolean;
  /** Extra response headers, e.g. `Retry-After` or `WWW-Authenticate`. */
  headers?: Record<string, string>;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;
  public readonly headers?: Record<string, string>;

  constructor(statusCode: number, message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = options.code ?? "APP_ERROR";
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    this.headers = options.headers;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message = "Bad request", details?: unknown): AppError {
    return new AppError(400, message, { code: "BAD_REQUEST", details });
  }

  static unauthorized(message = "Authentication required"): AppError {
    return new AppError(401, message, {
      code: "UNAUTHORIZED",
      headers: { "WWW-Authenticate": 'Bearer realm="pulse-watch"' },
    });
  }

  static forbidden(message = "Access denied", details?: unknown): AppError {
    return new AppError(403, message, { code: "FORBIDDEN", details });
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(404, message, { code: "NOT_FOUND" });
  }

  static conflict(message = "Conflict"): AppError {
    return new AppError(409, message, { code: "CONFLICT" });
  }

  static unprocessable(message = "Unprocessable entity", details?: unknown): AppError {
    return new AppError(422, message, { code: "UNPROCESSABLE_ENTITY", details });
  }

  static tooManyRequests(message = "Too many requests", retryAfterSeconds = 30): AppError {
    return new AppError(429, message, {
      code: "TOO_MANY_REQUESTS",
      details: { retryAfterSeconds },
      headers: { "Retry-After": String(retryAfterSeconds) },
    });
  }

  static internal(message = "Internal server error"): AppError {
    return new AppError(500, message, { code: "INTERNAL_ERROR", isOperational: false });
  }

  static badGateway(message = "Bad gateway"): AppError {
    return new AppError(502, message, { code: "BAD_GATEWAY" });
  }

  static serviceUnavailable(message = "Service unavailable", retryAfterSeconds = 60): AppError {
    return new AppError(503, message, {
      code: "SERVICE_UNAVAILABLE",
      details: { retryAfterSeconds },
      headers: { "Retry-After": String(retryAfterSeconds) },
    });
  }

  static gatewayTimeout(message = "Gateway timeout"): AppError {
    return new AppError(504, message, { code: "GATEWAY_TIMEOUT" });
  }
}
