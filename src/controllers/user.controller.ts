import { FastifyRequest, FastifyReply } from "fastify";
import { UserService } from "../services/user.service";
import { success, created, error } from "../utils/api-response";
import type { CreateUserInput, UpdateUserInput, PaginationInput } from "../validations/user.validation";

export class UserController {
  constructor(private userService: UserService) {}

  getUsers = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.userService.getUsers(request.query as PaginationInput);
      return success(reply, result);
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };

  getUserById = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await this.userService.getUserById(id);
      return success(reply, result);
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };

  createUser = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.userService.createUser(request.body as CreateUserInput);
      return created(reply, result);
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };

  updateUser = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await this.userService.updateUser(id, request.body as UpdateUserInput);
      return success(reply, result);
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };

  deleteUser = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await this.userService.deleteUser(id);
      return success(reply, result);
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };
}
