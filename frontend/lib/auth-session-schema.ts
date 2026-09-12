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
});

export type SessionData = z.infer<typeof sessionDataSchema>;

export const sessionExchangeResponseSchema = z.object({
  token: z.string().min(1),
});
