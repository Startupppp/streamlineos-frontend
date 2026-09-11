import { z } from "zod";

export const verifyEmailContract = z.object({
  autoLoginToken: z.string(),
});

export const invitationValidateContract = z.object({
  email: z.string(),
  organizationName: z.string(),
  role: z.string(),
  userExists: z.boolean(),
});

export const acceptInvitationContract = z.object({
  ok: z.literal(true),
  autoLoginToken: z.string(),
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
