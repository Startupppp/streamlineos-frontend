import { z } from "zod";

export const inputItemContract = z.object({
  id: z.number(),
  userId: z.string(),
  source: z.enum(["ATTENDANCE", "LEAVE", "TIMESHEET", "UPLOAD", "MANUAL"]),
  scheduledDays: z.string(),
  paidDays: z.string(),
  lopDays: z.string(),
  halfDays: z.string(),
  overtimeHours: z.string(),
  shiftAllowanceUnits: z.string(),
  holidayWorkDays: z.string(),
  billableHours: z.string(),
  isOverride: z.boolean(),
  overrideReason: z.string().nullable(),
  createdAt: z.string(),
  userName: z.string().nullable(),
  userEmail: z.string(),
});

export const inputsListContract = z.array(inputItemContract);

export const reimportResponseContract = z.object({
  ok: z.literal(true),
  count: z.number(),
});

export const patchInputResponseContract = z.object({ ok: z.boolean() });

export type InputItem = z.infer<typeof inputItemContract>;
