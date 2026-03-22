import { FastifyInstance } from "fastify";
import { UserRepository } from "../repositories/user.repository";
import { hashPassword, comparePassword, generateOTP } from "../utils/hash";
import { EmailService } from "./email/email.service";
import { SmsService } from "./sms/sms.service";
import { env } from "../config/env";
import { v4 as uuid } from "uuid";
import type {
  LoginInput,
  ForgotPasswordInput,
  VerifyCodeInput,
  ResetPasswordInput,
} from "../validations/auth.validation";

export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService,
    private smsService: SmsService,
    private fastify: FastifyInstance
  ) {}

  async login(input: LoginInput) {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw Object.assign(new Error("Invalid email or password"), { statusCode: 401 });
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      throw Object.assign(new Error("Invalid email or password"), { statusCode: 401 });
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.fastify.jwt.sign(payload, { expiresIn: env.JWT_EXPIRES_IN });

    const refreshToken = uuid();
    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 7);
    await this.userRepo.saveRefreshToken(user.id, refreshToken, refreshExpiry);

    await this.userRepo.updateLastLogin(user.id);

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  async refreshToken(token: string) {
    const stored = await this.userRepo.findRefreshToken(token);
    if (!stored || stored.expiresAt < new Date()) {
      throw Object.assign(new Error("Invalid or expired refresh token"), { statusCode: 401 });
    }

    const user = await this.userRepo.findById(stored.userId);
    if (!user || !user.isActive) {
      throw Object.assign(new Error("User not found"), { statusCode: 401 });
    }

    await this.userRepo.deleteRefreshToken(token);

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.fastify.jwt.sign(payload, { expiresIn: env.JWT_EXPIRES_IN });

    const newRefreshToken = uuid();
    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 7);
    await this.userRepo.saveRefreshToken(user.id, newRefreshToken, refreshExpiry);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      return { message: "If an account exists, a reset code has been sent" };
    }

    const code = generateOTP(6);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.userRepo.createPasswordReset(user.id, code, expiresAt);

    await this.emailService.sendPasswordReset(user.email, user.fullName, code);

    if (user.phone) {
      await this.smsService.sendPasswordResetCode(user.phone, code);
    }

    return { message: "If an account exists, a reset code has been sent" };
  }

  async verifyCode(input: VerifyCodeInput) {
    const result = await this.userRepo.findValidPasswordReset(input.email, input.code);
    if (!result) {
      throw Object.assign(new Error("Invalid or expired verification code"), { statusCode: 400 });
    }
    return { valid: true, message: "Code verified successfully" };
  }

  async resetPassword(input: ResetPasswordInput) {
    const result = await this.userRepo.findValidPasswordReset(input.email, input.code);
    if (!result) {
      throw Object.assign(new Error("Invalid or expired verification code"), { statusCode: 400 });
    }

    const newHash = await hashPassword(input.password);
    await this.userRepo.update(result.user.id, { passwordHash: newHash });
    await this.userRepo.markPasswordResetUsed(result.reset.id);
    await this.userRepo.deleteAllRefreshTokens(result.user.id);

    await this.emailService.sendPasswordChanged(result.user.email, result.user.fullName);

    return { message: "Password reset successfully" };
  }

  async logout(refreshToken: string) {
    await this.userRepo.deleteRefreshToken(refreshToken);
    return { message: "Logged out successfully" };
  }
}
