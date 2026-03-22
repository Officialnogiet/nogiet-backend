import { z } from "zod";

export const createUserSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  role: z.enum(["super_admin", "admin", "member"]).default("member"),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(["super_admin", "admin", "member"]).optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid("Invalid user ID"),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
