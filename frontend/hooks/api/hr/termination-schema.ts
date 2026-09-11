import { z } from "zod";

const terminationEmployeeContract = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    designation: z.string().nullable(),
    employeeId: z.string().nullable(),
  })
  .nullable();

export const terminationItemContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  userId: z.string(),
  status: z.enum(["DRAFT", "PENDING_FINAL", "APPROVED", "REJECTED", "SENT", "COMPLETED"]),
  reasons: z.array(z.string()),
  detailedExplanation: z.string(),
  effectiveDate: z.string(),
  severanceAmount: z.string().nullable(),
  noticePeriodWaived: z.boolean(),
  internalNotes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  finalRemarks: z.string().nullable(),
  finalReviewedBy: z.string().nullable(),
  finalReviewedAt: z.string().nullable(),
  emailSentAt: z.string().nullable(),
  emailStatus: z.string().nullable(),
  initiatedBy: z.string().nullable(),
  employee: terminationEmployeeContract,
});

export const terminationListContract = z.object({
  data: z.array(terminationItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
  statusCounts: z.record(z.string(), z.number().int()),
});

export const terminationSuccessContract = z.object({ success: z.literal(true) });

export const terminationLetterContract = z.object({ html: z.string() });

export type TerminationItem = z.infer<typeof terminationItemContract>;
export type TerminationListResponse = z.infer<typeof terminationListContract>;
