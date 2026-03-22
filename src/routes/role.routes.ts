import { FastifyInstance } from "fastify";
import { RoleController } from "../controllers/role.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";

export function roleRoutes(fastify: FastifyInstance, controller: RoleController) {
  fastify.get("/roles", {
    preHandler: [authenticate, authorize("super_admin", "admin")],
    handler: controller.getRoles,
  });

  fastify.get("/permissions", {
    preHandler: [authenticate, authorize("super_admin")],
    handler: controller.getPermissions,
  });

  fastify.put("/roles/:roleName/permissions", {
    preHandler: [authenticate, authorize("super_admin")],
    handler: controller.updateRolePermissions,
  });
}
