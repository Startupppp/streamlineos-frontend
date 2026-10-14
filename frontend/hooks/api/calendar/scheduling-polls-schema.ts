import { z } from "zod";

const voteCounts = z.object({ yes: z.number().int(), maybe: z.number().int(), no: z.number().int() });

export const schedulingPollContract = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(["open", "finalizing", "finalized", "cancelled", "expired"]),
  expiresAt: z.string(),
  holdOptions: z.boolean(),
  selectedOptionId: z.string().uuid().nullable(),
  finalizedBookingId: z.string().uuid().nullable(),
  version: z.number().int().positive(),
  options: z.array(z.object({
    id: z.string().uuid(),
    startAt: z.string(),
    endAt: z.string(),
    status: z.enum(["proposed", "unavailable", "selected", "released"]),
    votes: voteCounts,
  })),
  viewer: z.object({
    voterId: z.string().uuid(),
    requirement: z.enum(["required", "optional"]),
    responses: z.record(z.string().uuid(), z.enum(["yes", "maybe", "no"])),
  }).nullable(),
});

export const schedulingPollListContract = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    ruleId: z.number().int().positive(),
    title: z.string(),
    status: z.enum(["open", "finalizing", "finalized", "cancelled", "expired"]),
    expiresAt: z.string(),
    version: z.number().int().positive(),
    createdAt: z.string(),
  })),
  nextCursor: z.string().nullable(),
});

export const createdSchedulingPollContract = z.object({
  poll: schedulingPollContract,
  voterLinks: z.array(z.object({ voterId: z.string().uuid(), email: z.string().email(), token: z.string() })),
});

export const finalizedSchedulingPollContract = z.object({
  outcome: z.enum(["finalized", "pending", "unavailable"]),
  poll: schedulingPollContract,
  alternatives: z.array(z.object({ start: z.string(), end: z.string(), localStart: z.string(), localEnd: z.string() })),
});

export type SchedulingPoll = z.infer<typeof schedulingPollContract>;
export type SchedulingPollList = z.infer<typeof schedulingPollListContract>;
export type CreatedSchedulingPoll = z.infer<typeof createdSchedulingPollContract>;
export type FinalizedSchedulingPoll = z.infer<typeof finalizedSchedulingPollContract>;
