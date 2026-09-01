import { z } from "zod";
import { refineDateOrder, refineNotBeforeToday } from "@/lib/date-constraints";
import { formatModuleName } from "@/features/build/modules/lib/module-name";

export const MODULE_STATUSES = [
  "backlog",
  "planned",
  "in-progress",
  "paused",
  "completed",
  "cancelled",
] as const;

export const DESC_MAX = 500;

const moduleNameSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z
      .string()
      .min(2, "Module name must be at least 2 characters")
      .max(80, "Module name must be 80 characters or fewer")
      .regex(/[A-Za-z0-9]/, "Module name must contain at least one letter or number"),
  );

export const createModuleSchema = z
  .object({
    icon: z.string().optional(),
    name: moduleNameSchema,
    description: z
      .string()
      .max(DESC_MAX, `Description must be ${DESC_MAX} characters or fewer`)
      .optional(),
    status: z.enum(MODULE_STATUSES).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    leadId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const fullName = formatModuleName(data.icon, data.name);
    if (fullName.length > 80) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Module name must be 80 characters or fewer (including icon).",
        path: ["name"],
      });
    }
    refineNotBeforeToday(data.startDate, ctx, "startDate", "Start date cannot be in the past");
    refineNotBeforeToday(data.endDate, ctx, "endDate", "End date cannot be in the past");
    refineDateOrder(data, ctx, {
      mode: "after",
      message: "End date must be after start date",
    });
  });

export type CreateModuleForm = z.infer<typeof createModuleSchema>;

export const FORM_DEFAULTS: CreateModuleForm = {
  icon: undefined,
  name: "",
  description: "",
  status: "backlog",
  startDate: "",
  endDate: "",
  leadId: undefined,
};
