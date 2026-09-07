import { z } from "zod";

export const calendarEventContract = z.object({
  id: z.number(),
  orgId: z.string(),
  month: z.string(),
  type: z.string(),
  date: z.string(),
  title: z.string(),
  status: z.string(),
});

export const calendarEventListContract = z.array(calendarEventContract);

export const generateCalendarResponseContract = z.object({
  generated: z.number(),
  month: z.string(),
});

export type CalendarEvent = z.infer<typeof calendarEventContract>;
