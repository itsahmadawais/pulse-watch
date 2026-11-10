import { AppError } from "../../utils/app-error";
import { usersRepository, type UsersRepository } from "./users.repository";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from "./users.schema";
import type { Paginated, User } from "./users.types";

export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  list({ limit, offset }: ListUsersQuery): Paginated<User> {
    const { items, total } = this.repository.findAll(limit, offset);
    return { items, total, limit, offset };
  }

  getById(id: string): User {
    const user = this.repository.findById(id);
    if (!user) throw AppError.notFound(`User ${id} not found`);
    return user;
  }

  create(input: CreateUserInput): User {
    if (this.repository.findByEmail(input.email)) {
      throw AppError.conflict(`User with email ${input.email} already exists`);
    }
    return this.repository.create(input);
  }

  update(id: string, input: UpdateUserInput): User {
    if (input.email) {
      const owner = this.repository.findByEmail(input.email);
      if (owner && owner.id !== id) {
        throw AppError.conflict(`User with email ${input.email} already exists`);
      }
    }
    const user = this.repository.update(id, input);
    if (!user) throw AppError.notFound(`User ${id} not found`);
    return user;
  }

  remove(id: string): void {
    if (!this.repository.delete(id)) throw AppError.notFound(`User ${id} not found`);
  }
}

export const usersService = new UsersService(usersRepository);
