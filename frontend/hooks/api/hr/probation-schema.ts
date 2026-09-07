import { z } from "zod";

const probationReviewItemSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  employmentId: z.number().int(),
  personId: z.number().int(),
  probationEndDate: z.string(),
  status: z.string(),
  extensionCount: z.number().int(),
  extendedUntil: z.string().nullable(),
  confirmedAt: z.string().nullable(),
  createdAt: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  workEmail: z.string().nullable(),
});

const hrProbationReviewSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  employmentId: z.number().int(),
  personId: z.number().int(),
  probationEndDate: z.string(),
  status: z.string(),
  extensionCount: z.number().int(),
  extendedUntil: z.string().nullable(),
  reviewTemplateId: z.number().int().nullable(),
  reviewNotes: z.string().nullable(),
  confirmedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const probationListContract = z.object({
  data: z.array(probationReviewItemSchema),
  pageInfo: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const extendProbationContract = hrProbationReviewSchema;

export const confirmProbationContract = hrProbationReviewSchema;
