import { UserRepository } from "../repositories/user.repository";
import { hashPassword, generateOTP } from "../utils/hash";
import { EmailService } from "./email/email.service";
import type { CreateUserInput, UpdateUserInput, PaginationInput } from "../validations/user.validation";

export class UserService {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService
  ) {}

  async getUsers(query: PaginationInput) {
    const { page, limit, search } = query;
    const { data, total } = await this.userRepo.findAll({ page, limit }, search);

    const safeUsers = data.map(({ passwordHash: _, ...rest }: any) => rest);
    return {
      data: safeUsers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserById(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw Object.assign(new Error("User not found"), { statusCode: 404 });
    }
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async createUser(input: CreateUserInput) {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw Object.assign(new Error("Email already in use"), { statusCode: 409 });
    }

    const tempPassword = generateOTP(8);
    const passwordHash = await hashPassword(tempPassword);

    const user = await this.userRepo.create({
      ...input,
      passwordHash,
    });

    await this.emailService.sendWelcome(user.email, user.fullName, tempPassword);

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async updateUser(id: string, input: UpdateUserInput) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw Object.assign(new Error("User not found"), { statusCode: 404 });
    }

    if (input.email && input.email !== user.email) {
      const existing = await this.userRepo.findByEmail(input.email);
      if (existing) {
        throw Object.assign(new Error("Email already in use"), { statusCode: 409 });
      }
    }

    const updated = await this.userRepo.update(id, input);
    const { passwordHash: _, ...safeUser } = updated;
    return safeUser;
  }

  async deleteUser(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw Object.assign(new Error("User not found"), { statusCode: 404 });
    }
    await this.userRepo.delete(id);
    return { message: "User deleted successfully" };
  }
}
