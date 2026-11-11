import { AppError } from "../../utils/app-error";

/**
 * Realistic failure scenarios. Each one is served at `GET /api/v1/simulate/<name>` and is also
 * used by `/random`. Messages imitate what a real API would return, so the logs and
 * dashboards look like production traffic.
 */
export const errorScenarios = {
  unauthorized: () => AppError.unauthorized("Missing or invalid bearer token"),

  forbidden: () =>
    AppError.forbidden("Access denied: you do not have permission to access this resource", {
      requiredRole: "admin",
      currentRole: "viewer",
    }),

  "not-found": () => AppError.notFound("Order 42 not found"),

  conflict: () => AppError.conflict("Order 42 was modified by another request, please retry"),

  validation: () =>
    AppError.unprocessable("Order could not be processed", {
      fieldErrors: {
        quantity: ["Must be greater than 0"],
        couponCode: ["Coupon has expired"],
      },
    }),

  "rate-limit": () => AppError.tooManyRequests("Rate limit exceeded: 100 requests per minute", 30),

  // A plain Error (not AppError) behaves like an unexpected bug: the error handler hides
  // the message and returns a generic 500 INTERNAL_ERROR.
  "server-error": () => new Error("Cannot read properties of undefined (reading 'total')"),

  "bad-gateway": () => AppError.badGateway("Payment provider returned an invalid response"),

  unavailable: () =>
    AppError.serviceUnavailable("Service is temporarily down for maintenance", 120),
} satisfies Record<string, () => Error>;

export type ErrorScenario = keyof typeof errorScenarios;

export const errorScenarioNames = Object.keys(errorScenarios) as ErrorScenario[];
