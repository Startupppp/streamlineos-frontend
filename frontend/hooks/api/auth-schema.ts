import { z } from "zod";

/**
 * Contracts for `MeController` and `AuthController` handlers.
 *
 * `/me/login-history` uses PAGE-BASED pagination (page + total + limit),
 * NOT cursor pagination. `/users/:userId/login-history` is cursor-based and
 * lives in `users/extended-users-schema.ts`.
 *
 * Dates arrive as ISO strings over JSON, so timestamps are `z.string()`.
 * NOT `.strict()`: extra response fields are backward-compatible.
 */

const loginHistoryItemContract = z.object({
  id: z.string(),
  userId: z.string(),
  orgId: z.string().nullable(),
  event: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  browser: z.string(),
  os: z.string().nullable(),
  platform: z.string().nullable(),
  success: z.boolean(),
  failureReason: z.string().nullable(),
  createdAt: z.string(),
});

export const meLoginHistoryContract = z.object({
  data: z.array(loginHistoryItemContract),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const updateProfileContract = z.object({ success: z.literal(true) });

export const requestOtpContract = z.object({ message: z.string() });

export const verifyOtpContract = z.object({ autoLoginToken: z.string() });

export const sendMagicLinkContract = z.object({ message: z.string() });

export const mfaStatusContract = z.object({ enabled: z.boolean() });

export const mfaSetupContract = z.object({
  qrDataUrl: z.string(),
  secret: z.string(),
  manualEntryKey: z.string(),
  backupCodes: z.array(z.string()),
});

export const mfaVerifyContract = z.object({ enabled: z.literal(true) });

export const mfaDisableContract = z.object({ disabled: z.literal(true) });
