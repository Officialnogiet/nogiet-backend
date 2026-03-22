import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export function errorHandler(err: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  const statusCode = err.statusCode ?? 500;
  const message =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  if (statusCode >= 500) {
    _request.log.error(err);
  }

  return reply.status(statusCode).send({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}
