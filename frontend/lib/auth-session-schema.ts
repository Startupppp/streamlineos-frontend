import { z } from "zod";
import { PLANS } from "@/lib/billing/feature-gates";

// Mirrors the backend `authSessionDataResponseSchema`. Not strict: it also sends `cellId`.
export const sessionDataSchema = z.object({
  userId: z.string(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  role: z.string().nullable(),
  isActive: z.boolean(),
  orgId: z.string().nullable(),
  isOrgOwner: z.boolean(),
  enabledModules: z.array(z.string()),
  plan: z.enum(PLANS).nullable(),
  orgOnboardingCompletedAt: z.string().nullable(),
  userOnboardingCompletedAt: z.string().nullable(),
  organizationAccess: z.enum(["active", "suspended", "none"]),
  suspendedOrganizationName: z.string().nullable(),
  isPlatformAdmin: z.boolean().default(false),
});

export type SessionData = z.infer<typeof sessionDataSchema>;

export const sessionExchangeResponseSchema = z.object({
  token: z.string().min(1),
});

/**
 * The two identity responses the NextAuth bridge reads. Each declares only the
 * fields this client consumes, so a backward-compatible backend addition passes
 * and a removal, rename or retype fails — the same rule `ResponseContract` states
 * in `lib/api-envelope.ts`, applied here without dragging the browser error
 * reporter into the NextAuth module graph.
 *
 * `sessionId` is required on purpose. Without a registered device session the
 * session callback skips the backend-JWT exchange entirely, so a sign-in missing
 * one looks successful and then 401s on every API call; refusing it at the
 * boundary turns a silent dead session into a visible sign-in failure.
 */
export const magicLinkVerifyResponseSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
});

export const googleOAuthResponseSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
});
