import { FastifyRequest, FastifyReply } from "fastify";

export async function requestLogger(request: FastifyRequest, _reply: FastifyReply) {
  request.log.info(
    { method: request.method, url: request.url, ip: request.ip },
    "incoming request"
  );
}
