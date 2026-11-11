import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { errorScenarioNames } from "../../src/modules/simulate/simulate.scenarios";

const app = createApp();
const base = "/api/v1/simulate";

describe("simulate: slow responses", () => {
  it("GET /late responds 200 after the requested delay", async () => {
    const started = Date.now();
    const res = await request(app).get(`${base}/late?ms=120`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, delayMs: 120 });
    expect(Date.now() - started).toBeGreaterThanOrEqual(100);
  });

  it("GET /timeout waits and then returns 504", async () => {
    const res = await request(app).get(`${base}/timeout?ms=20`);
    expect(res.status).toBe(504);
    expect(res.body.error.code).toBe("GATEWAY_TIMEOUT");
  });

  it("rejects out-of-range delays with 400", async () => {
    const res = await request(app).get(`${base}/late?ms=999999`);
    expect(res.status).toBe(400);
  });
});

describe("simulate: error scenarios", () => {
  it.each([
    ["unauthorized", 401, "UNAUTHORIZED"],
    ["forbidden", 403, "FORBIDDEN"],
    ["not-found", 404, "NOT_FOUND"],
    ["conflict", 409, "CONFLICT"],
    ["validation", 422, "UNPROCESSABLE_ENTITY"],
    ["rate-limit", 429, "TOO_MANY_REQUESTS"],
    ["server-error", 500, "INTERNAL_ERROR"],
    ["bad-gateway", 502, "BAD_GATEWAY"],
    ["unavailable", 503, "SERVICE_UNAVAILABLE"],
  ])("GET /%s returns %i %s", async (name, status, code) => {
    const res = await request(app).get(`${base}/${name}`);
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
    expect(res.body.error.requestId).toBeTruthy();
  });

  it("covers every registered scenario", () => {
    expect(errorScenarioNames).toHaveLength(9);
  });

  it("forbidden returns an access-denied message and details", async () => {
    const res = await request(app).get(`${base}/forbidden`);
    expect(res.body.error.message).toMatch(/^Access denied/);
    expect(res.body.error.details).toEqual({ requiredRole: "admin", currentRole: "viewer" });
  });

  it("sets protocol headers (WWW-Authenticate, Retry-After)", async () => {
    const unauthorized = await request(app).get(`${base}/unauthorized`);
    expect(unauthorized.headers["www-authenticate"]).toContain("Bearer");

    const rateLimited = await request(app).get(`${base}/rate-limit`);
    expect(rateLimited.headers["retry-after"]).toBe("30");

    const unavailable = await request(app).get(`${base}/unavailable`);
    expect(unavailable.headers["retry-after"]).toBe("120");
  });

  it("server-error hides the internal message", async () => {
    const res = await request(app).get(`${base}/server-error`);
    expect(res.body.error.message).toBe("Internal server error");
  });
});

describe("simulate: random mix", () => {
  it("always succeeds with errorRate=0", async () => {
    const res = await request(app).get(`${base}/random?errorRate=0&maxLatencyMs=0`);
    expect(res.status).toBe(200);
  });

  it("always fails with errorRate=1", async () => {
    const res = await request(app).get(`${base}/random?errorRate=1&maxLatencyMs=0`);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("simulate: index", () => {
  it("GET / lists the available endpoints", async () => {
    const res = await request(app).get(base);
    expect(res.status).toBe(200);
    expect(res.body.errors.forbidden).toBe(`${base}/forbidden`);
  });
});
