import { randomUUID } from "node:crypto";
import type { CreateUserInput, UpdateUserInput } from "./users.schema";
import type { User } from "./users.types";

/**
 * In-memory data store. Swap this file for a real database implementation
 * (Postgres, Mongo, ...) without touching the service or controller layers.
 */
export class UsersRepository {
  private readonly users = new Map<string, User>();

  findAll(limit: number, offset: number): { items: User[]; total: number } {
    const all = [...this.users.values()];
    return { items: all.slice(offset, offset + limit), total: all.length };
  }

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  findByEmail(email: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  create(input: CreateUserInput): User {
    const now = new Date().toISOString();
    const user: User = { id: randomUUID(), ...input, createdAt: now, updatedAt: now };
    this.users.set(user.id, user);
    return user;
  }

  update(id: string, input: UpdateUserInput): User | undefined {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated: User = { ...existing, ...input, updatedAt: new Date().toISOString() };
    this.users.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.users.delete(id);
  }

  clear(): void {
    this.users.clear();
  }
}

export const usersRepository = new UsersRepository();
