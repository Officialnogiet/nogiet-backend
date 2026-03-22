import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword, generateOTP } from "../../utils/hash";

describe("Hash Utilities", () => {
  it("should hash and verify a password", async () => {
    const password = "TestPassword123!";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(20);

    const isValid = await comparePassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await comparePassword("wrong-password", hash);
    expect(isInvalid).toBe(false);
  });

  it("should generate OTP of correct length", () => {
    const otp4 = generateOTP(4);
    expect(otp4).toHaveLength(4);
    expect(/^\d+$/.test(otp4)).toBe(true);

    const otp6 = generateOTP(6);
    expect(otp6).toHaveLength(6);
    expect(/^\d+$/.test(otp6)).toBe(true);
  });
});
