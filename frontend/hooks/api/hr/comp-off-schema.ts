import { z } from "zod";

export const compOffBalanceContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  earnedDays: z.string(),
  usedDays: z.string(),
  expiryDate: z.string().nullable(),
  updatedAt: z.string(),
});

export const compOffBalanceListContract = z.array(compOffBalanceContract);
