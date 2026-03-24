import { eq, ilike, or, sql, desc } from "drizzle-orm";
import { users, refreshTokens, passwordResets } from "../db/schema/index";
import type { PaginationParams } from "../types/index";

export class UserRepository {
  constructor(private db: any) {}

  async findById(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  async findByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  }

  async create(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    phone?: string;
    role?: "super_admin" | "admin" | "member" | "facility_owner";
  }) {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  async update(id: string, data: Partial<typeof users.$inferInsert>) {
    const [user] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user ?? null;
  }

  async delete(id: string) {
    const [user] = await this.db.delete(users).where(eq(users.id, id)).returning();
    return user ?? null;
  }

  async findAll({ page, limit }: PaginationParams, search?: string) {
    const offset = (page - 1) * limit;
    const conditions = search
      ? or(
          ilike(users.fullName, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      : undefined;

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(conditions)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(conditions),
    ]);

    return { data, total: Number(countResult[0]?.count ?? 0) };
  }

  async findAdminUsers() {
    return this.db
      .select({ id: users.id, email: users.email, fullName: users.fullName, role: users.role })
      .from(users)
      .where(or(eq(users.role, "super_admin"), eq(users.role, "admin")));
  }

  async updateLastLogin(id: string) {
    return this.update(id, { lastLoginAt: new Date() });
  }

  // Refresh token operations
  async saveRefreshToken(userId: string, token: string, expiresAt: Date) {
    await this.db.insert(refreshTokens).values({ userId, token, expiresAt });
  }

  async findRefreshToken(token: string) {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token))
      .limit(1);
    return row ?? null;
  }

  async deleteRefreshToken(token: string) {
    await this.db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  async deleteAllRefreshTokens(userId: string) {
    await this.db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  // Password reset operations
  async createPasswordReset(userId: string, code: string, expiresAt: Date) {
    await this.db.insert(passwordResets).values({ userId, code, expiresAt });
  }

  async findValidPasswordReset(email: string, code: string) {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const [reset] = await this.db
      .select()
      .from(passwordResets)
      .where(eq(passwordResets.userId, user.id))
      .orderBy(desc(passwordResets.createdAt))
      .limit(1);

    if (!reset || reset.code !== code || reset.usedAt || reset.expiresAt < new Date()) {
      return null;
    }
    return { reset, user };
  }

  async markPasswordResetUsed(id: string) {
    await this.db
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(eq(passwordResets.id, id));
  }
}
