import { z } from "zod";

export const addHolidaySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  date: z.string().min(1, "Date is required").regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  recurring: z.boolean().optional(),
});

export type AddHolidayValues = z.infer<typeof addHolidaySchema>;
