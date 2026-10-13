import { z } from "zod";

export const calendarSavedViewDefinitionContract = z.object({
  dateLogic: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("today") }),
    z.object({ kind: z.literal("next-seven-days") }),
    z.object({ kind: z.literal("this-week") }),
    z.object({ kind: z.literal("this-month") }),
    z.object({ kind: z.literal("custom"), start: z.string(), end: z.string() }),
  ]),
  mode: z.enum(["calendar", "list", "my-day"]),
  sourceKey: z.string().optional(),
  ownerMembershipId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  location: z.string().optional(),
  status: z.string().optional(),
  actionable: z.boolean().optional(),
});

export const calendarSavedViewContract = z.object({
  id: z.uuid(),
  name: z.string(),
  scope: z.enum(["personal", "team"]),
  ownerMembershipId: z.number().int().positive().nullable(),
  definition: calendarSavedViewDefinitionContract,
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const calendarSavedViewListContract = z.object({
  items: z.array(calendarSavedViewContract),
  nextCursor: z.uuid().nullable(),
});

export const calendarSavedViewRemoveContract = z.object({ removed: z.boolean() });

export type CalendarSavedView = z.infer<typeof calendarSavedViewContract>;
export type CalendarSavedViewDefinition = z.infer<typeof calendarSavedViewDefinitionContract>;
export type CalendarSavedViewList = z.infer<typeof calendarSavedViewListContract>;
