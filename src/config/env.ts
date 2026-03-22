import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  CARBON_MAPPER_API_URL: z
    .string()
    .default("https://api.carbonmapper.org/api/v1"),
  CARBON_MAPPER_EMAIL: z.string().optional(),
  CARBON_MAPPER_PASSWORD: z.string().optional(),

  // Resend (Email)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("NOGIET Portal <noreply@nogiet.gov.ng>"),

  // Termii (SMS)
  TERMII_API_KEY: z.string().optional(),
  TERMII_SENDER_ID: z.string().default("NOGIET"),
  TERMII_BASE_URL: z.string().default("https://v3.api.termii.com"),

  // Cloudflare R2 (S3-compatible storage)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default("nogiet"),
  R2_PUBLIC_URL: z.string().optional(),

  REDIS_URL: z.string().default("redis://localhost:6379"),

  FRONTEND_URL: z.string().default("http://localhost:5173"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
