import { z } from "zod";

export const internalMyApplicationSchema = z.object({
  applicationId: z.number().int(),
  appliedAt: z.string(),
  status: z.string(),
  managerDecision: z.string().nullable(),
  managerDecidedAt: z.string().nullable(),
  jobTitle: z.string(),
  jobPostingId: z.number().int(),
});

export const internalMyApplicationListSchema = z.array(internalMyApplicationSchema);

export const internalApprovalSchema = z.object({
  applicationId: z.number().int(),
  appliedAt: z.string(),
  status: z.string(),
  decision: z.string().nullable(),
  decidedAt: z.string().nullable(),
  note: z.string().nullable(),
  jobTitle: z.string(),
  candidateFirstName: z.string(),
  candidateLastName: z.string(),
});

export const internalApprovalListSchema = z.array(internalApprovalSchema);

export const internalApprovalResultSchema = z.object({
  id: z.number().int(),
  decision: z.string().nullable(),
  decidedAt: z.string().nullable(),
});

export type InternalMyApplication = z.infer<typeof internalMyApplicationSchema>;
export type InternalApproval = z.infer<typeof internalApprovalSchema>;
