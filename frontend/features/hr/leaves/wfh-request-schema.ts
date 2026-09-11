import { z } from "zod";
import { format } from "date-fns";

export const WFH_NOTES_MAX_LENGTH = 500;

/** The backend caps `reason` at 1000, and notes are appended to it on submit. */
export const WFH_REASON_MAX_LENGTH = 1000;
const NOTES_SEPARATOR = " — ";

export function composeWfhReason(reason: string, notes?: string): string {
  return notes ? `${reason}${NOTES_SEPARATOR}${notes}` : reason;
}

export const wfhFormSchema = z.object({
  date: z
    .string()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .refine(
      (v) => v >= format(new Date(), "yyyy-MM-dd"),
      "Date cannot be in the past",
    )
    .refine((v) => new Date(v).getDay() !== 0, "Cannot select a Sunday"),
  reason: z.string().min(1, "Reason is required"),
  notes: z
    .string()
    .max(WFH_NOTES_MAX_LENGTH, `Notes must be ${WFH_NOTES_MAX_LENGTH} characters or fewer`)
    .optional(),
  approverId: z.string().min(1, "Approver is required"),
}).superRefine((values, ctx) => {
  const composed = composeWfhReason(values.reason, values.notes);
  if (composed.length > WFH_REASON_MAX_LENGTH) {
    ctx.addIssue({
      code: "custom",
      path: ["reason"],
      message: `Reason and notes together must be ${WFH_REASON_MAX_LENGTH} characters or fewer`,
    });
  }
});

export type WfhFormValues = z.infer<typeof wfhFormSchema>;
