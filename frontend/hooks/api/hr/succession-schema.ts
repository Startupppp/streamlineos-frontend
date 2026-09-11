import { z } from "zod";

export const successionPlanContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  positionId: z.string().nullable(),
  positionTitle: z.string().nullable(),
  incumbentUserId: z.string().nullable(),
  incumbentMembershipId: z.number().int().nullable(),
  successorUserId: z.string().nullable(),
  successorMembershipId: z.number().int().nullable(),
  readiness: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const successionPlanListContract = z.object({
  items: z.array(successionPlanContract),
  nextCursor: z.string().nullable(),
});

export type SuccessionPlanResponse = z.infer<typeof successionPlanContract>;
export type SuccessionPlanListResponse = z.infer<typeof successionPlanListContract>;
