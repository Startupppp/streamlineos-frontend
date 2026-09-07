import { z } from "zod";

export const timerContract = z.object({
  id: z.number(),
  userMembershipId: z.number().nullable(),
  projectId: z.number().nullable(),
  ticketId: z.number().nullable(),
  description: z.string().nullable(),
  billable: z.boolean(),
  startedAt: z.string(),
  lastResumedAt: z.string().nullable(),
  accumulatedSeconds: z.number(),
  status: z.enum(["RUNNING", "PAUSED", "STOPPED", "DISCARDED", "CONVERTED"]),
  elapsedSeconds: z.number(),
  project: z.object({ id: z.number(), name: z.string() }).nullable(),
  ticket: z.object({ id: z.number(), title: z.string() }).nullable(),
});

export const timerNullableResponseContract = timerContract.nullable();

export type TimesheetTimer = z.infer<typeof timerContract>;
