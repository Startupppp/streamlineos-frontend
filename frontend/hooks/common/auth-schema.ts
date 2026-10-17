import { z } from "zod";

export const verifyEmailContract = z.object({
  autoLoginToken: z.string(),
});

export const invitationValidateContract = z.object({
  id: z.string(),
  email: z.string(),
  organizationName: z.string(),
  role: z.string(),
  userExists: z.boolean(),
});

export const requestInvitationOtpContract = z.object({
  ok: z.literal(true),
});

export const skippedGrantItemContract = z.object({
  module: z.string(),
  reason: z.enum(["INVITER_AUTHORITY_REVOKED", "ROLE_NOT_SEEDED"]),
});

export type SkippedGrant = z.infer<typeof skippedGrantItemContract>;

export const acceptInvitationContract = z.object({
  ok: z.literal(true),
  autoLoginToken: z.string(),
  skippedGrants: z.array(skippedGrantItemContract),
});

export const declineInvitationContract = z.object({
  ok: z.literal(true),
});

export const resendVerificationContract = z.object({
  message: z.string(),
});

export const logoutContract = z.object({
  success: z.boolean(),
}).or(z.object({}));

export const pendingInvitationItemContract = z.object({
  id: z.string(),
  organizationName: z.string(),
  role: z.string(),
  expiresAt: z.string(),
});

export const pendingInvitationsForMeContract = z.array(pendingInvitationItemContract);

export type PendingInvitationItem = z.infer<typeof pendingInvitationItemContract>;

export const claimInvitationResponseContract = z.object({
  ok: z.literal(true),
  autoLoginToken: z.string(),
  skippedGrants: z.array(z.object({
    module: z.string(),
    reason: z.enum(["INVITER_AUTHORITY_REVOKED", "ROLE_NOT_SEEDED"]),
  })),
});
