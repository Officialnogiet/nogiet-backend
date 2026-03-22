import { FastifyInstance } from "fastify";
import { UploadController } from "../controllers/upload.controller";
import { authenticate } from "../middlewares/auth.middleware";

export function uploadRoutes(fastify: FastifyInstance, controller: UploadController) {
  fastify.post("/upload/avatar", {
    preHandler: [authenticate],
    handler: controller.uploadAvatar,
  });

  fastify.post("/upload/document", {
    preHandler: [authenticate],
    handler: controller.uploadDocument,
  });

  fastify.delete("/upload", {
    preHandler: [authenticate],
    handler: controller.deleteFile,
  });
}
