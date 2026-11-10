export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    options: { code?: string; details?: unknown; isOperational?: boolean } = {},
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = options.code ?? "APP_ERROR";
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message = "Bad request", details?: unknown): AppError {
    return new AppError(400, message, { code: "BAD_REQUEST", details });
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(404, message, { code: "NOT_FOUND" });
  }

  static conflict(message = "Conflict"): AppError {
    return new AppError(409, message, { code: "CONFLICT" });
  }

  static internal(message = "Internal server error"): AppError {
    return new AppError(500, message, { code: "INTERNAL_ERROR", isOperational: false });
  }
}
