import { Router } from "express";
import { validate } from "../../middlewares/validate";
import { createUser, deleteUser, getUser, listUsers, updateUser } from "./users.controller";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamsSchema,
} from "./users.schema";

export const usersRouter = Router();

usersRouter.get("/", validate({ query: listUsersQuerySchema }), listUsers);
usersRouter.post("/", validate({ body: createUserSchema }), createUser);
usersRouter.get("/:id", validate({ params: userIdParamsSchema }), getUser);
usersRouter.patch(
  "/:id",
  validate({ params: userIdParamsSchema, body: updateUserSchema }),
  updateUser,
);
usersRouter.delete("/:id", validate({ params: userIdParamsSchema }), deleteUser);
