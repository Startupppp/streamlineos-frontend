import { z } from "zod";

export const createDepartmentInputSchema = z.object({
  name: z.string().min(1, "Department name is required"),
});

export const updateProfileInputSchema = z.object({
  userId: z.string().min(1),
  designation: z.string().optional(),
  departmentId: z.number().int().positive().optional(),
  phone: z.string().optional(),
});

export const generatePayrollInputSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
});
