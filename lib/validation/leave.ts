import { z } from "zod";

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const requestLeaveInputSchema = z.object({
  typeId: z.number().int().positive(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  reason: z.string().min(1, "Reason is required"),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "End date must be after or equal to start date",
  path: ["endDate"],
});
