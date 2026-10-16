import { z } from "zod";
import type { ExecuteSubjectRequestInput } from "@/hooks/api/privacy/subject-requests";

export const subjectRequestSchema = z.object({
  kind: z.enum(["export", "erasure"]),
  subjectEmail: z.string().trim().toLowerCase().email("Enter the subject's email").max(254),
  dueBy: z.string(),
  backupsExpireBy: z.string().trim().max(64, "Keep it under 64 characters"),
});

export type SubjectRequestInput = z.input<typeof subjectRequestSchema>;
export type SubjectRequestValues = z.output<typeof subjectRequestSchema>;

/** Blank optional fields are omitted: the DTO is strict and `dueBy` is coerced to a date. */
export function toExecutePayload(values: SubjectRequestValues): ExecuteSubjectRequestInput {
  return {
    kind: values.kind,
    subjectEmail: values.subjectEmail,
    ...(values.dueBy ? { dueBy: values.dueBy } : {}),
    ...(values.backupsExpireBy ? { backupsExpireBy: values.backupsExpireBy } : {}),
  };
}
