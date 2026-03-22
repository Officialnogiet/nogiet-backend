import { FastifyRequest, FastifyReply } from "fastify";
import { RoleService } from "../services/role.service";
import { success, error } from "../utils/api-response";

export class RoleController {
  constructor(private roleService: RoleService) {}

  getRoles = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.roleService.getAllRoles();
      return success(reply, result);
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };

  getPermissions = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.roleService.getAllPermissions();
      return success(reply, result);
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };

  updateRolePermissions = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { roleName } = request.params as { roleName: string };
      const { permissionIds } = request.body as { permissionIds: string[] };
      const result = await this.roleService.updateRolePermissions(roleName, permissionIds);
      return success(reply, result, "Permissions updated");
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };
}
