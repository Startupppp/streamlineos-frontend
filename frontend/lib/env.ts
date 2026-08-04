import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters")
    .refine(
      (val) => process.env.NODE_ENV !== "production" || val.length >= 44,
      "In production, NEXTAUTH_SECRET must be at least 44 characters (256-bit base64)",
    ),

  BACKEND_JWT_SECRET: z
    .string()
    .min(
      44,
      "BACKEND_JWT_SECRET must be at least 44 characters (256-bit base64, matching the backend)",
    )
    .optional(),

  INTERNAL_API_SECRET: z
    .string()
    .min(
      32,
      "INTERNAL_API_SECRET must be at least 32 characters (matching the backend)",
    )
    .optional(),

  NEXT_PUBLIC_API_URL: z.string().url(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_SITE_VERIFICATION: z.string().optional(),
});

const result = serverSchema.safeParse(process.env);
if (!result.success) {
  const issues = result.error.issues
    .map((i) => `  ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  console.error(`[env] Validation failed:\n${issues}`);

  if (process.env.NODE_ENV === "production")
    throw new Error("Missing or invalid required environment variables");
}
