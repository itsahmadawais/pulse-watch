import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";

const app = createApp();

describe("metrics endpoint", () => {
  it("GET /metrics exposes default Node.js metrics in Prometheus format", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.text).toContain("process_cpu_user_seconds_total");
    expect(res.text).toContain('service="pulse-watch"');
  });
});
