import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_URL: process.env.NODE_ENV === "production" ? z.string().url() : z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters")
    .refine(
      (val) => process.env.NODE_ENV !== "production" || val.length >= 44,
      "In production, NEXTAUTH_SECRET must be at least 44 characters (256 bits base64)"
    ),
  SENDGRID_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["sendgrid", "smtp", "azure"]).optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  R2_REGION: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),
  ALLOW_TEST_EMAIL: z.string().optional(),
  TEST_EMAIL: z.string().email().optional().or(z.literal("")),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_QR_REDIRECT_BASE_URL: z.string().optional(),
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().optional(),
});

function validateEnv() {
  const serverResult = serverSchema.safeParse(process.env);

  if (!serverResult.success) {
    const missing = serverResult.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`Environment validation failed:\n${missing}`);

    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing required environment variables");
    }
  }

  return serverResult.success ? serverResult.data : (process.env as unknown as z.infer<typeof serverSchema>);
}

function validateClientEnv() {
  const clientResult = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_QR_REDIRECT_BASE_URL: process.env.NEXT_PUBLIC_QR_REDIRECT_BASE_URL,
    NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
  });

  return clientResult.success ? clientResult.data : ({} as z.infer<typeof clientSchema>);
}

export const serverEnv = validateEnv();
export const clientEnv = validateClientEnv();
