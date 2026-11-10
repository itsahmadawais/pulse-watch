import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { usersRepository } from "../../src/modules/users/users.repository";

const app = createApp();

describe("users API", () => {
  beforeEach(() => usersRepository.clear());

  it("creates, reads, updates and deletes a user", async () => {
    const created = await request(app)
      .post("/api/v1/users")
      .send({ name: "Ada", email: "ADA@example.com" });
    expect(created.status).toBe(201);
    expect(created.body.email).toBe("ada@example.com");

    const id: string = created.body.id;

    const fetched = await request(app).get(`/api/v1/users/${id}`);
    expect(fetched.status).toBe(200);

    const updated = await request(app).patch(`/api/v1/users/${id}`).send({ name: "Ada L." });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe("Ada L.");

    const list = await request(app).get("/api/v1/users?limit=10");
    expect(list.body.total).toBe(1);

    const deleted = await request(app).delete(`/api/v1/users/${id}`);
    expect(deleted.status).toBe(204);
  });

  it("rejects invalid payloads with 400", async () => {
    const res = await request(app).post("/api/v1/users").send({ name: "", email: "nope" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("rejects duplicate emails with 409", async () => {
    await request(app).post("/api/v1/users").send({ name: "A", email: "a@example.com" });
    const res = await request(app)
      .post("/api/v1/users")
      .send({ name: "B", email: "a@example.com" });
    expect(res.status).toBe(409);
  });

  it("returns 404 for a missing user", async () => {
    const res = await request(app).get("/api/v1/users/00000000-0000-4000-8000-000000000000");
    expect(res.status).toBe(404);
  });
});
