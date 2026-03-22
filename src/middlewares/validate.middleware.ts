import { FastifyRequest, FastifyReply } from "fastify";
import { ZodSchema, ZodError } from "zod";
import { error } from "../utils/api-response";

type ValidationTarget = "body" | "params" | "querystring";

export function validate(schema: ZodSchema, target: ValidationTarget = "body") {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = target === "body"
        ? request.body
        : target === "params"
          ? request.params
          : request.query;

      const parsed = schema.parse(data);

      if (target === "body") request.body = parsed;
      else if (target === "params") (request as any).params = parsed;
      else (request as any).query = parsed;
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const path = issue.path.join(".");
          if (!fieldErrors[path]) fieldErrors[path] = [];
          fieldErrors[path].push(issue.message);
        }
        return error(reply, "Validation failed", 422, fieldErrors);
      }
      throw err;
    }
  };
}
