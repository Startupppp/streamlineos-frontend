import { z } from "zod";
import { refineDateOrder, refineNotBeforeToday } from "@/lib/date-constraints";

export const cycleSchema = z.object({
  name: z.string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be at most 100 characters")
    .regex(/[a-zA-Z0-9]/, "Must contain at least one letter or number")
    .refine((v) => !/\s{2,}/.test(v), "Cannot have consecutive spaces"),
  type: z.enum(["QUARTERLY", "HALF_YEARLY", "ANNUAL", "CUSTOM"]),
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  deadline: z.string().min(1, "Deadline is required"),
}).superRefine((data, ctx) => {
  refineNotBeforeToday(data.periodStart, ctx, "periodStart", "Period start cannot be in the past");
  refineDateOrder(data, ctx, {
    startKey: "periodStart",
    endKey: "periodEnd",
    mode: "after",
    message: "Period end must be after period start",
  });
  refineDateOrder(data, ctx, {
    startKey: "periodEnd",
    endKey: "deadline",
    mode: "after",
    message: "Deadline must be after period end",
  });
});

export type CycleFormValues = z.infer<typeof cycleSchema>;
