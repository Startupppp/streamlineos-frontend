import { z } from "zod";
import {
  missingOnCreate,
  requiredFieldMessage,
} from "@/features/timesheets/settings/required-fields";

const baseLogTimeSchema = z.object({
  date: z.string().min(1, "Date is required"),
  hours: z
    .string()
    .min(1, "Hours is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid number (e.g. 1.5)"),
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

/**
 * The org's `requiredFields` policy is a runtime value, so the resolver is
 * built per render rather than declared once. Passing an empty list yields the
 * schema this file used to export — which is what a user without
 * `timesheets:settings:view` gets, and the server stays the boundary for them.
 */
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
