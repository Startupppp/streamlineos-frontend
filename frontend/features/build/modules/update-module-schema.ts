import { z } from "zod";
import { refineDateOrder } from "@/lib/date-refinements";
import { MODULE_STATUSES, DESC_MAX } from "./create-module-schema";

export const updateModuleSchema = z
  .object({
    version: z.number().int().positive(),
    name: z
      .string()
      .transform((v) => v.trim())
      .pipe(
        z
          .string()
          .min(2, "Module name must be at least 2 characters")
          .max(80, "Module name must be 80 characters or fewer")
          .regex(
            /[A-Za-z0-9]/,
            "Module name must contain at least one letter or number",
          ),
      )
      .optional(),
    description: z
      .string()
      .max(DESC_MAX, `Description must be ${DESC_MAX} characters or fewer`)
      .optional(),
    status: z.enum(MODULE_STATUSES).optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    leadId: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    refineDateOrder(data, ctx, {
      mode: "after",
      message: "End date must be after start date",
    });
  });

export type UpdateModulePayload = z.infer<typeof updateModuleSchema>;

export const editModuleSchema = z.object({
  name: z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z
        .string()
        .min(2, "Module name must be at least 2 characters")
        .max(80, "Module name must be 80 characters or fewer")
        .regex(
          /[A-Za-z0-9]/,
          "Module name must contain at least one letter or number",
        ),
    ),
  description: z
    .string()
    .max(DESC_MAX, `Description must be ${DESC_MAX} characters or fewer`)
    .optional(),
  status: z.enum(MODULE_STATUSES),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  leadId: z.string().optional(),
});

export type EditModuleForm = z.infer<typeof editModuleSchema>;

export const EDIT_FORM_DEFAULTS: EditModuleForm = {
  name: "",
  description: "",
  status: "backlog",
  startDate: "",
  endDate: "",
  leadId: undefined,
};
