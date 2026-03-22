import { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "../services/auth.service";
import { success, error } from "../utils/api-response";
import type {
  LoginInput,
  ForgotPasswordInput,
  VerifyCodeInput,
  ResetPasswordInput,
  RefreshTokenInput,
} from "../validations/auth.validation";

export class AuthController {
  constructor(private authService: AuthService) {}

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.authService.login(request.body as LoginInput);
      return success(reply, result, "Login successful");
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };

  refreshToken = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = request.body as RefreshTokenInput;
      const result = await this.authService.refreshToken(refreshToken);
      return success(reply, result, "Token refreshed");
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };

  forgotPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.authService.forgotPassword(request.body as ForgotPasswordInput);
      return success(reply, result);
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };

  verifyCode = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.authService.verifyCode(request.body as VerifyCodeInput);
      return success(reply, result);
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };

  resetPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await this.authService.resetPassword(request.body as ResetPasswordInput);
      return success(reply, result);
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = request.body as RefreshTokenInput;
      const result = await this.authService.logout(refreshToken);
      return success(reply, result);
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      return success(reply, user, "Current user");
    } catch (err: any) {
      return error(reply, err.message, err.statusCode ?? 500);
    }
  };
}
