import { z } from "zod";

export const leaveFormSchema = z
  .object({
    leaveTypeId: z.string().min(1, "Leave type is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    halfDay: z.boolean(),
    halfDayPeriod: z.enum(["AM", "PM"]),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
    reason: z
      .string()
      .trim()
      .min(10, "Reason must be at least 10 characters")
      .max(500, "Reason must be at most 500 characters"),
    approverId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "To date must be on or after From date",
          path: ["endDate"],
        });
      }
      if (data.halfDay && data.startDate !== data.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Half day leave cannot span multiple dates",
          path: ["endDate"],
        });
      }
    }
  });

export type LeaveFormValues = z.infer<typeof leaveFormSchema>;
