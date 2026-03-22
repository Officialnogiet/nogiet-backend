import { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import {
  loginSchema,
  forgotPasswordSchema,
  verifyCodeSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from "../validations/auth.validation";

export function authRoutes(fastify: FastifyInstance, controller: AuthController) {
  fastify.post("/auth/login", {
    preHandler: [validate(loginSchema)],
    handler: controller.login,
  });

  fastify.post("/auth/refresh", {
    preHandler: [validate(refreshTokenSchema)],
    handler: controller.refreshToken,
  });

  fastify.post("/auth/forgot-password", {
    preHandler: [validate(forgotPasswordSchema)],
    handler: controller.forgotPassword,
  });

  fastify.post("/auth/verify-code", {
    preHandler: [validate(verifyCodeSchema)],
    handler: controller.verifyCode,
  });

  fastify.post("/auth/reset-password", {
    preHandler: [validate(resetPasswordSchema)],
    handler: controller.resetPassword,
  });

  fastify.post("/auth/logout", {
    preHandler: [validate(refreshTokenSchema)],
    handler: controller.logout,
  });

  fastify.get("/auth/me", {
    preHandler: [authenticate],
    handler: controller.me,
  });
}
