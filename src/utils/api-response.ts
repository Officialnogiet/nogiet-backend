import { FastifyReply } from "fastify";
import type { ApiResponse } from "../types/index";

export function success<T>(reply: FastifyReply, data: T, message = "Success", statusCode = 200) {
  const response: ApiResponse<T> = { success: true, message, data };
  return reply.status(statusCode).send(response);
}

export function created<T>(reply: FastifyReply, data: T, message = "Created successfully") {
  return success(reply, data, message, 201);
}

export function error(
  reply: FastifyReply,
  message: string,
  statusCode = 400,
  errors?: Record<string, string[]>
) {
  const response: ApiResponse = { success: false, message, errors };
  return reply.status(statusCode).send(response);
}

export function notFound(reply: FastifyReply, message = "Resource not found") {
  return error(reply, message, 404);
}

export function unauthorized(reply: FastifyReply, message = "Unauthorized") {
  return error(reply, message, 401);
}

export function forbidden(reply: FastifyReply, message = "Forbidden") {
  return error(reply, message, 403);
}
