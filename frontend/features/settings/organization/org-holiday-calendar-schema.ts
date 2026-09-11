import { z } from "zod";

export const addHolidaySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  recurring: z.boolean().optional(),
});

export type AddHolidayValues = z.infer<typeof addHolidaySchema>;
