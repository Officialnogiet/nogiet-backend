import { FastifyRequest, FastifyReply } from "fastify";
import { CloudflareR2Service } from "../services/third-party/cloudflare-r2.service";
import { success, error } from "../utils/api-response";

export class UploadController {
  constructor(private r2: CloudflareR2Service) {}

  uploadAvatar = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();
      if (!data) {
        return error(reply, "No file provided", 400);
      }

      const buffer = await data.toBuffer();
      const result = await this.r2.uploadBuffer(buffer, "avatars", data.mimetype);

      return success(reply, {
        url: result.url,
        key: result.key,
      });
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };

  uploadDocument = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();
      if (!data) {
        return error(reply, "No file provided", 400);
      }

      const buffer = await data.toBuffer();
      const result = await this.r2.uploadBuffer(buffer, "documents", data.mimetype);

      return success(reply, {
        url: result.url,
        key: result.key,
      });
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };

  deleteFile = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { key } = request.body as { key: string };
      await this.r2.delete(key);
      return success(reply, null, "File deleted");
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };
}
