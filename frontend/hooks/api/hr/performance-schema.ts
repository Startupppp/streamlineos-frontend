import { z } from "zod";

const successContract = z.object({ success: z.literal(true) });

const reviewCycleRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  type: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  deadline: z.string().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"]),
  description: z.string().nullable(),
  templateId: z.number().int().nullable(),
  templateVersion: z.number().int().nullable(),
  ratingScale: z.record(z.string(), z.unknown()).nullable(),
  createdBy: z.string().nullable(),
  createdByMembershipId: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const reviewRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  reviewerId: z.string().nullable(),
  cycleId: z.number().int().nullable(),
  periodStart: z.string(),
  periodEnd: z.string(),
  status: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]),
  ratings: z
    .array(z.object({ category: z.string(), score: z.number(), comment: z.string().optional() }))
    .nullable(),
  strengths: z.string().nullable(),
  improvements: z.string().nullable(),
  goals: z.array(z.object({ goal: z.string(), achieved: z.boolean() })).nullable(),
  overallRating: z.string().nullable(),
  comments: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const userMinSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

const userNameSchema = z.object({ id: z.string(), name: z.string().nullable() });

const oneOnOneMeetingBaseSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  managerId: z.string(),
  managerMembershipId: z.number().int().nullable(),
  employeeId: z.string(),
  employeeMembershipId: z.number().int().nullable(),
  duration: z.number().int(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
  notes: z.string().nullable(),
  actionItems: z.array(z.object({ text: z.string(), done: z.boolean() })).nullable(),
  agenda: z.string().nullable(),
  meetingLink: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const pipBaseSchema = z.object({
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

export const listCyclesContract = z.array(reviewCycleRowSchema);
export const createCycleContract = reviewCycleRowSchema;
export const updateCycleContract = successContract;
export const deleteCycleContract = successContract;

export const createReviewContract = reviewRowSchema;
export const updateReviewContract = successContract;
export const deleteReviewContract = successContract;

export const updateGoalContract = successContract;
export const deleteGoalContract = successContract;

export const listOneOnOnesContract = z.array(
  oneOnOneMeetingBaseSchema.extend({
    scheduledAt: z.string(),
    manager: userMinSchema.nullable(),
    employee: userMinSchema.nullable(),
  }),
);

export const createOneOnOneContract = oneOnOneMeetingBaseSchema.extend({
  scheduledAt: z.string(),
});

export const updateOneOnOneContract = successContract;
export const deleteOneOnOneContract = successContract;

export const listPipsContract = z.array(
  pipBaseSchema.extend({
    user: userMinSchema.nullable(),
    manager: userNameSchema.nullable(),
    hrRep: userNameSchema.nullable(),
  }),
);

export const createPipContract = pipBaseSchema;
export const updatePipContract = successContract;
