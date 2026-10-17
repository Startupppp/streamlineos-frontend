import { z } from "zod";

export const acceptInvitationResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
});
