import { z } from "zod";
import {
  missingOnCreate,
  requiredFieldMessage,
} from "@/features/timesheets/settings/required-fields";

/** A day cannot hold more hours than it has. Shared with the week grid's cell validation. */
export const MAX_HOURS_PER_DAY = 24;

const baseLogTimeSchema = z.object({
  date: z.string().min(1, "Date is required"),
  hours: z
    .string()
    .min(1, "Hours is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a positive number of hours (e.g. 1.5)")
    .refine((value) => Number(value) > 0, "Hours must be more than 0")
    .refine(
      (value) => Number(value) <= MAX_HOURS_PER_DAY,
      `Hours cannot exceed ${MAX_HOURS_PER_DAY} in a day`,
    ),
  projectId: z.number().nullable(),
  ticketId: z.number().nullable(),
  description: z.string(),
  isBillable: z.boolean(),
});

export type LogTimeValues = z.infer<typeof baseLogTimeSchema>;

const PATHS = {
  project: "projectId",
  ticket: "ticketId",
  description: "description",
} as const;

export function logTimeSchemaFor(requiredFields: readonly string[]) {
  return baseLogTimeSchema.superRefine((values, ctx) => {
    for (const field of missingOnCreate(requiredFields, values))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [PATHS[field]],
        message: requiredFieldMessage(field),
      });
  });
}
