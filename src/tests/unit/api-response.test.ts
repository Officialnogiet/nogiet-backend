import { describe, it, expect, vi } from "vitest";

describe("API Response Utilities", () => {
  function createMockReply() {
    const reply: any = {
      statusCode: 200,
      status(code: number) {
        reply.statusCode = code;
        return reply;
      },
      send(data: any) {
        reply.sentData = data;
        return reply;
      },
      sentData: null,
    };
    return reply;
  }

  it("should send a success response", async () => {
    const { success } = await import("../../utils/api-response.js");
    const reply = createMockReply();
    success(reply, { id: 1 }, "OK");
    expect(reply.statusCode).toBe(200);
    expect(reply.sentData.success).toBe(true);
    expect(reply.sentData.data.id).toBe(1);
  });

  it("should send a created response", async () => {
    const { created } = await import("../../utils/api-response.js");
    const reply = createMockReply();
    created(reply, { id: 1 });
    expect(reply.statusCode).toBe(201);
    expect(reply.sentData.success).toBe(true);
  });

  it("should send an error response", async () => {
    const { error } = await import("../../utils/api-response.js");
    const reply = createMockReply();
    error(reply, "Something went wrong", 400);
    expect(reply.statusCode).toBe(400);
    expect(reply.sentData.success).toBe(false);
  });

  it("should send unauthorized response", async () => {
    const { unauthorized } = await import("../../utils/api-response.js");
    const reply = createMockReply();
    unauthorized(reply);
    expect(reply.statusCode).toBe(401);
    expect(reply.sentData.message).toBe("Unauthorized");
  });
});
