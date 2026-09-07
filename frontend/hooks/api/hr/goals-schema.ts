import { z } from "zod";

export const goalContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  targetValue: z.string().nullable(),
  currentValue: z.string(),
  unit: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  progress: z.number().int(),
  parentGoalId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const goalListContract = z.array(goalContract);
