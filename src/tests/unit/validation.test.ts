import { describe, it, expect } from "vitest";
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../../validations/auth.validation";
import { createUserSchema } from "../../validations/user.validation";

describe("Auth Validation", () => {
  describe("loginSchema", () => {
    it("should pass with valid email and password", () => {
      const result = loginSchema.safeParse({ email: "test@example.com", password: "password123" });
      expect(result.success).toBe(true);
    });

    it("should fail with invalid email", () => {
      const result = loginSchema.safeParse({ email: "bad-email", password: "password123" });
      expect(result.success).toBe(false);
    });

    it("should fail with short password", () => {
      const result = loginSchema.safeParse({ email: "test@example.com", password: "12345" });
      expect(result.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("should pass with valid email", () => {
      const result = forgotPasswordSchema.safeParse({ email: "test@example.com" });
      expect(result.success).toBe(true);
    });

    it("should fail with missing email", () => {
      const result = forgotPasswordSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("should pass with matching passwords", () => {
      const result = resetPasswordSchema.safeParse({
        email: "test@example.com",
        code: "123456",
        password: "newPassword1",
        confirmPassword: "newPassword1",
      });
      expect(result.success).toBe(true);
    });

    it("should fail with mismatched passwords", () => {
      const result = resetPasswordSchema.safeParse({
        email: "test@example.com",
        code: "123456",
        password: "newPassword1",
        confirmPassword: "differentPassword",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("User Validation", () => {
  describe("createUserSchema", () => {
    it("should pass with valid input", () => {
      const result = createUserSchema.safeParse({
        fullName: "John Doe",
        email: "john@example.com",
        role: "member",
      });
      expect(result.success).toBe(true);
    });

    it("should fail without fullName", () => {
      const result = createUserSchema.safeParse({ email: "john@example.com" });
      expect(result.success).toBe(false);
    });
  });
});
