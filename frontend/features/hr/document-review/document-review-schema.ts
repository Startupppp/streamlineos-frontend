import { z } from "zod";

const onboardingDocsSummaryItemContract = z.object({
  userId: z.string(),
  userName: z.string().nullable(),
  userImage: z.string().nullable(),
  designation: z.string().nullable(),
  employeeId: z.string().nullable(),
  onboardingDocStatus: z.enum(["PENDING", "IN_PROGRESS", "APPROVED"]),
  totalRequired: z.number().int(),
  totalSubmitted: z.number().int(),
  totalApproved: z.number().int(),
  totalRejected: z.number().int(),
});

export const onboardingDocsSummaryContract = z.object({
  data: z.array(onboardingDocsSummaryItemContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
    total: z.number().int(),
  }),
});

export type OnboardingDocsSummary = z.infer<typeof onboardingDocsSummaryContract>;
