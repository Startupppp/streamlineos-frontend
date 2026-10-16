import { z } from "zod";

const workingHoursWindow = z.object({
  weekday: z.number().int().min(1).max(7),
  start: z.string(),
  end: z.string(),
});

const intakeField = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "email", "phone", "textarea", "select"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export const bookingRuleContract = z.object({
  id: z.number().int(),
  status: z.enum(["draft", "active", "paused", "revoked"]),
  version: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number().int(),
  slotIntervalMinutes: z.number().int(),
  minimumNoticeMinutes: z.number().int(),
  maximumAdvanceDays: z.number().int(),
  bufferBeforeMinutes: z.number().int(),
  bufferAfterMinutes: z.number().int(),
  dailyLimit: z.number().int(),
  timeZone: z.string(),
  workingHours: z.array(workingHoursWindow),
  intakeFields: z.array(intakeField),
  cancellationNoticeMinutes: z.number().int(),
  rescheduleNoticeMinutes: z.number().int(),
  requiresApproval: z.boolean(),
  linkExpiresAt: z.string().nullable(),
  activatedAt: z.string().nullable(),
  pausedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const bookingRulesContract = z.array(bookingRuleContract);

export const bookingRuleActivationContract = z.object({
  rule: bookingRuleContract,
  publicToken: z.string().nullable(),
});

export const bookingRuleOfferingContract = z.object({
  title: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number().int(),
  timeZone: z.string(),
  version: z.number().int(),
  intakeFields: z.array(intakeField),
  cancellationNoticeMinutes: z.number().int(),
  rescheduleNoticeMinutes: z.number().int(),
  requiresApproval: z.boolean(),
  availabilityState: z.enum(["available", "no_slots", "uncertain"]),
  message: z.string(),
  slots: z.array(z.object({
    start: z.string(),
    end: z.string(),
    localStart: z.string(),
    localEnd: z.string(),
  })),
});

export type CalendarBookingRule = z.infer<typeof bookingRuleContract>;
export type CalendarBookingWorkingHours = z.infer<typeof workingHoursWindow>;
export type CalendarBookingIntakeField = z.infer<typeof intakeField>;
export type CalendarBookingOffering = z.infer<typeof bookingRuleOfferingContract>;
