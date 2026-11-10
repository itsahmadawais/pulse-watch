import { z } from "zod";

export const userIdParamsSchema = z.object({
  id: z.uuid(),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().toLowerCase(),
});

export const updateUserSchema = createUserSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required" });

export const listUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
