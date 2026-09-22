import { z } from "zod";
import type { HrLeaveType } from "@/hooks/api/hr/leaves-types";

export const leaveTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be 100 characters or fewer"),
  daysPerYear: z
    .string()
    .trim()
    .min(1, { message: "Days per year is required", abort: true })
    .refine((value) => /^\d+$/.test(value), { message: "Days per year must be a whole number", abort: true })
    .refine((value) => Number(value) <= 365, "Days per year must be between 0 and 365"),
  carryForward: z.boolean(),
});

export type LeaveTypeFormValues = z.infer<typeof leaveTypeSchema>;

export const LEAVE_TYPE_DEFAULTS: LeaveTypeFormValues = {
  name: "",
  daysPerYear: "12",
  carryForward: false,
};

export function leaveTypeFormValues(type: HrLeaveType | null): LeaveTypeFormValues {
  if (!type) return LEAVE_TYPE_DEFAULTS;
  return { name: type.name, daysPerYear: String(type.daysPerYear), carryForward: type.carryForward };
}
