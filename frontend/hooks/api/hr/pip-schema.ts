import { z } from "zod";

const pipRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  userMembershipId: z.number().int().nullable(),
  managerId: z.string(),
  managerMembershipId: z.number().int().nullable(),
  hrRepId: z.string().nullable(),
  hrRepMembershipId: z.number().int().nullable(),
  reason: z.string(),
  objectives: z
    .array(z.object({ objective: z.string(), metric: z.string(), deadline: z.string() }))
    .nullable(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  outcome: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const userMinSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

const userNameSchema = z.object({ id: z.string(), name: z.string().nullable() });

export const listPipsContract = z.array(
  pipRowSchema.extend({
    user: userMinSchema.nullable(),
    manager: userNameSchema.nullable(),
    hrRep: userNameSchema.nullable(),
  }),
);

export const createPipContract = pipRowSchema;

export const updatePipContract = z.object({ success: z.literal(true) });
