import { z } from "zod";
import { refineDateOrder } from "@/lib/date-constraints";

export const reviewFormSchema = z
  .object({
    employeeId: z.string(),
    cycleId: z.string(),
    periodStart: z.string().min(1, "Period start is required"),
    periodEnd: z.string().min(1, "Period end is required"),
    isEdit: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.isEdit && !data.employeeId.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Employee is required",
        path: ["employeeId"],
      });
    }
    refineDateOrder(data, ctx, {
      startKey: "periodStart",
      endKey: "periodEnd",
      mode: "after",
      message: "Period end must be after period start",
    });
  });
