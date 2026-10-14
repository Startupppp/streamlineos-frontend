import { z } from "zod";

export const leaveFormSchema = z
  .object({
    leaveTypeId: z.string().min(1, "Leave type is required"),
    startDate: z.string().min(1, "Start date is required"),
    // Half-day leave is a single date: the end is the start and is not asked for.
    endDate: z.string(),
    halfDay: z.boolean(),
    halfDayPeriod: z.enum(["AM", "PM"]),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
    reason: z
      .string()
      .trim()
      .min(10, "Reason must be at least 10 characters")
      .max(500, "Reason must be at most 500 characters"),
  })
  .superRefine((data, ctx) => {
    if (!data.halfDay && !data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date is required",
        path: ["endDate"],
      });
    }
    if (!data.halfDay && data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "To date must be on or after From date",
          path: ["endDate"],
        });
      }
    }
  });

export type LeaveFormValues = z.infer<typeof leaveFormSchema>;

/** The end date the request covers: a half day ends on the day it starts. */
export function effectiveLeaveEnd(values: Pick<LeaveFormValues, "halfDay" | "startDate" | "endDate">): string {
  return values.halfDay ? values.startDate : values.endDate;
}
