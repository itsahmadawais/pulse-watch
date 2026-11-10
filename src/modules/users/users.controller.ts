import type { Request, Response } from "express";
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
  UserIdParams,
} from "./users.schema";
import { usersService } from "./users.service";

export const listUsers = (_req: Request, res: Response): void => {
  const query = res.locals.validated.query as ListUsersQuery;
  res.status(200).json(usersService.list(query));
};

export const getUser = (_req: Request, res: Response): void => {
  const { id } = res.locals.validated.params as UserIdParams;
  res.status(200).json(usersService.getById(id));
};

export const createUser = (req: Request, res: Response): void => {
  const user = usersService.create(req.body as CreateUserInput);
  req.log.info({ userId: user.id }, "user created");
  res.status(201).json(user);
};

export const updateUser = (req: Request, res: Response): void => {
  const { id } = res.locals.validated.params as UserIdParams;
  res.status(200).json(usersService.update(id, req.body as UpdateUserInput));
};

export const deleteUser = (req: Request, res: Response): void => {
  const { id } = res.locals.validated.params as UserIdParams;
  usersService.remove(id);
  req.log.info({ userId: id }, "user deleted");
  res.status(204).send();
};
