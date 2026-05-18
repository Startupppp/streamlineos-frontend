import { differenceInCalendarDays, eachDayOfInterval, isSunday } from "date-fns";
import { z } from "zod";

export const leaveRequestPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

const dateStringSchema = z
  .string()
  .min(1, "Date is required")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date");

const leaveAttachmentSchema = z.string().url("Attachment must be a valid URL");

export const MAX_LEAVE_ATTACHMENTS = 1;

export function calculateLeaveDaysExcludingSundays({
  startDate,
  endDate,
  isHalfDay,
}: {
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
}): number {
  if (isHalfDay) return 0.5;

  const days = eachDayOfInterval({
    start: new Date(startDate),
    end: new Date(endDate),
  });

  return days.filter((day) => !isSunday(day)).length;
}

interface LeaveValidationHooks {
  getAvailableBalance?: (leaveTypeId: string, requestedDays: number) => number | null | undefined;
}

export function createLeaveRequestSchema(hooks: LeaveValidationHooks = {}) {
  return z
    .object({
      leaveTypeId: z.string().min(1, "Leave type is required"),
      startDate: dateStringSchema,
      endDate: dateStringSchema,
      halfDay: z.boolean(),
      halfDayPeriod: z.enum(["AM", "PM"]).optional(),
      priority: leaveRequestPrioritySchema,
      reason: z
        .string()
        .trim()
        .min(1, "Reason is required")
        .max(500, "Reason must be 500 characters or less"),
      attachments: z.array(leaveAttachmentSchema).max(
        MAX_LEAVE_ATTACHMENTS,
        `You can upload at most ${MAX_LEAVE_ATTACHMENTS} attachment`,
      ),
    })
    .superRefine((data, ctx) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "To date must be after or equal to from date",
          path: ["endDate"],
        });
      }

      if (data.halfDay && data.startDate !== data.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Half-day leave can only be requested for one day",
          path: ["halfDay"],
        });
      }

      if (data.halfDay && !data.halfDayPeriod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select a half-day period",
          path: ["halfDayPeriod"],
        });
      }

      if (!data.halfDay && data.halfDayPeriod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Half-day period is only allowed for half-day leave",
          path: ["halfDayPeriod"],
        });
      }

      const requestedDays = calculateLeaveDaysExcludingSundays({
        startDate: data.startDate,
        endDate: data.endDate,
        isHalfDay: data.halfDay,
      });

      if (requestedDays <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selected dates fall on Sunday. Please choose a working day.",
          path: ["startDate"],
        });
      }

      if (hooks.getAvailableBalance) {
        const available = hooks.getAvailableBalance(data.leaveTypeId, requestedDays);
        if (typeof available === "number" && requestedDays > available) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Insufficient balance. Available: ${available} day(s)`,
            path: ["leaveTypeId"],
          });
        }
      }
    });
}

export function createWfhRequestSchema() {
  return z
    .object({
      startDate: dateStringSchema,
      endDate: dateStringSchema,
      reason: z.string().trim().min(1, "Reason is required"),
      notes: z.string().trim().max(500, "Notes must be 500 characters or less").optional(),
      approverId: z.string().min(1, "Approver is required"),
    })
    .superRefine((data, ctx) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date cannot be before start date",
          path: ["endDate"],
        });
      }

      const requestedDays = calculateLeaveDaysExcludingSundays({
        startDate: data.startDate,
        endDate: data.endDate,
        isHalfDay: false,
      });
      if (requestedDays <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "WFH request cannot be submitted only for Sunday.",
          path: ["startDate"],
        });
      }
    });
}
