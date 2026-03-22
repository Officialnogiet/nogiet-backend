import { FastifyInstance } from "fastify";
import { UserController } from "../controllers/user.controller";
import { validate } from "../middlewares/validate.middleware";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  paginationSchema,
} from "../validations/user.validation";

export function userRoutes(fastify: FastifyInstance, controller: UserController) {
  fastify.get("/users", {
    preHandler: [authenticate, authorize("super_admin", "admin"), validate(paginationSchema, "querystring")],
    handler: controller.getUsers,
  });

  fastify.get("/users/:id", {
    preHandler: [authenticate, authorize("super_admin", "admin"), validate(userIdParamSchema, "params")],
    handler: controller.getUserById,
  });

  fastify.post("/users", {
    preHandler: [authenticate, authorize("super_admin"), validate(createUserSchema)],
    handler: controller.createUser,
  });

  fastify.patch("/users/:id", {
    preHandler: [
      authenticate,
      authorize("super_admin"),
      validate(userIdParamSchema, "params"),
      validate(updateUserSchema),
    ],
    handler: controller.updateUser,
  });

  fastify.delete("/users/:id", {
    preHandler: [authenticate, authorize("super_admin"), validate(userIdParamSchema, "params")],
    handler: controller.deleteUser,
  });
}
