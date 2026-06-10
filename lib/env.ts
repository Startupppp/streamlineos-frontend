import { z } from "zod";

/* ─── Folder taxonomy for the R2 bucket ─────────────────────────────────── */

export const R2_FOLDERS = {
  avatars: "avatars/",
  orgLogos: "org-logos/",
  branding: "branding/",
  blog: "blog/",
  chatAttachments: "chat-attachments/",
  candidateResumes: "candidates/resumes/",
  candidatePhotos: "candidates/photos/",
  candidateDocuments: "candidates/documents/",
  employeeDocuments: "employees/documents/",
  payslips: "payslips/",
  esign: "esign/",
  qrCodes: "qr-codes/",
  exports: "exports/",
  emailAttachments: "email-attachments/",
  temp: "temp/",
} as const;

export type R2FolderKey = keyof typeof R2_FOLDERS;
export const R2_FOLDER_PREFIXES = Object.values(R2_FOLDERS);

/* ─── Server-side schema (loose — optional unless app cannot boot) ──────── */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters")
    .refine(
      (val) => process.env.NODE_ENV !== "production" || val.length >= 44,
      "In production, NEXTAUTH_SECRET must be at least 44 characters (256-bit base64)",
    ),

  ENCRYPTION_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["resend", "sendgrid"]).default("resend"),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),
  OWNER_EMAIL: z.string().email().optional(),

  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_SITE_VERIFICATION: z.string().optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_REGION: z.string().default("auto"),
  R2_BUCKET_NAME: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),

  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),

  ABLY_API_KEY: z.string().optional(),

  TURNSTILE_SECRET_KEY: z.string().optional(),
});

/* ─── Client-side schema (NEXT_PUBLIC_*) ────────────────────────────────── */

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_ENABLED: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_CLARITY_ID: z.string().optional(),
});

function validateEnv() {
  const result = serverSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`[env] Validation failed:\n${issues}`);

    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing or invalid required environment variables");
    }
  }

  return result.success
    ? result.data
    : (process.env as unknown as z.infer<typeof serverSchema>);
}

function validateClientEnv() {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    NEXT_PUBLIC_GOOGLE_ENABLED: process.env.NEXT_PUBLIC_GOOGLE_ENABLED,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_CLARITY_ID: process.env.NEXT_PUBLIC_CLARITY_ID,
  });

  return result.success ? result.data : ({} as z.infer<typeof clientSchema>);
}

export const serverEnv = validateEnv();
export const clientEnv = validateClientEnv();

/* ─── Strict R2 loader (for scripts/tools that REQUIRE R2 to work) ──────── */

const r2RequiredSchema = z.object({
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_REGION: z.string().min(1).default("auto"),
  R2_BUCKET_NAME: z.string().min(1, "R2_BUCKET_NAME is required"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
  R2_ENDPOINT: z
    .string()
    .url("R2_ENDPOINT must be a full URL, e.g. https://<account>.r2.cloudflarestorage.com"),
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type R2Config = z.infer<typeof r2RequiredSchema>;

export function loadR2Config(): R2Config {
  const parsed = r2RequiredSchema.safeParse({
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_REGION: process.env.R2_REGION,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_ENDPOINT: process.env.R2_ENDPOINT,
    NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `[env] Missing or invalid R2 environment variables:\n${issues}\n\n` +
        `Set these in .env before running R2 operations.`,
    );
  }

  return parsed.data;
}
