import { z } from "zod";


export const userStatsContract = z.object({
  total: z.number(),
  active: z.number(),
  suspended: z.number(),
  archived: z.number(),
  pendingInvitations: z.number(),
  newThisMonth: z.number(),
});

export type UserStats = z.infer<typeof userStatsContract>;
