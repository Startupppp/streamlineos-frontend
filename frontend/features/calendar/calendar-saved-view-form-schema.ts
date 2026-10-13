import { z } from "zod";

export const calendarSavedViewFormSchema = z.object({
  name: z.string().trim().min(1).max(100),
  scope: z.enum(["personal", "team"]),
  dateKind: z.enum(["today", "next-seven-days", "this-week", "this-month", "custom"]),
  sourceKey: z.string().max(100),
  ownerMembershipId: z.string().regex(/^(all|me|[1-9]\d{0,9})$/),
  projectId: z.string().regex(/^(all|[1-9]\d{0,9})$/),
  location: z.string().trim().max(200),
  status: z.string().trim().max(100),
  actionable: z.enum(["all", "true", "false"]),
});

export type CalendarSavedViewFormValues = z.infer<typeof calendarSavedViewFormSchema>;
