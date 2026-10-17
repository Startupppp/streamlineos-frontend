import { z } from "zod";

export const calendarProtectedWorkContract = z.object({
  id: z.number().int().positive(),
  orgId: z.string(),
  eventId: z.number().int().positive(),
  ownerMembershipId: z.number().int().positive(),
  deadline: z.string(),
  estimateMinutes: z.number().int().positive(),
  priority: z.number().int(),
  locked: z.boolean(),
  maxMovesPerDay: z.number().int(),
  maxDailyMinutes: z.number().int(),
  movesToday: z.number().int(),
  movesOn: z.string().nullable(),
  lastMovedAt: z.string().nullable(),
  priorStart: z.string().nullable(),
  priorEnd: z.string().nullable(),
  undoUntil: z.string().nullable(),
  undoEventVersion: z.number().int().nullable(),
  moveReason: z.string().nullable(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const calendarProtectedWorkListContract = z.array(calendarProtectedWorkContract.omit({
  orgId: true,
  ownerMembershipId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string(),
  start: z.string(),
  end: z.string(),
  eventVersion: z.number().int(),
}));

export type CalendarProtectedWork = z.infer<typeof calendarProtectedWorkContract>;
export type CalendarProtectedWorkList = z.infer<typeof calendarProtectedWorkListContract>;

export const calendarProtectedWorkSuggestionsContract = z.object({
  slots: z.array(z.object({ start: z.string(), end: z.string() })),
  evaluatedAt: z.string(),
  horizonEnd: z.string(),
  horizonTruncated: z.boolean(),
  coverageState: z.enum(["complete", "partial"]),
  reason: z.enum(["locked", "no_safe_slot"]).nullable(),
});

export type CalendarProtectedWorkSuggestions = z.infer<typeof calendarProtectedWorkSuggestionsContract>;
