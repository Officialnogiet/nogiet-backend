import { FastifyRequest, FastifyReply } from "fastify";
import type { JwtPayload } from "../types/index";
import { unauthorized, forbidden } from "../utils/api-response";

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    (request as any).user = decoded;
  } catch {
    return unauthorized(reply, "Invalid or expired token");
  }
}

export function authorize(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as JwtPayload | undefined;
    if (!user) {
      return unauthorized(reply);
    }
    if (user.role === "super_admin") return;
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return forbidden(reply, "You do not have permission to access this resource");
    }
  };
}
