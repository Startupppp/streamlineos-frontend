import { z } from "zod";

const feedbackCycleContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isAnonymous: z.boolean(),
  questions: z.array(z.object({
    id: z.string(),
    text: z.string(),
    type: z.enum(["rating", "text"]),
  })),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
});

export const listCyclesContract = z.array(feedbackCycleContract);
export const createCycleContract = z.array(feedbackCycleContract);

const feedbackCycleRequestContract = z.object({
  id: z.number().int(),
  orgId: z.string().nullable(),
  cycleId: z.number().int(),
  subjectId: z.string(),
  subjectMembershipId: z.number().int().nullable(),
  reviewerId: z.string(),
  reviewerMembershipId: z.number().int().nullable(),
  relationship: z.string(),
  status: z.string(),
  submittedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const updateCycleStatusContract = z.array(feedbackCycleContract);

export const getMyPendingReviewsContract = z.array(z.object({
  id: z.number().int(),
  cycleId: z.number().int(),
  subjectId: z.string(),
  reviewerId: z.string(),
  relationship: z.string(),
  status: z.string(),
  createdAt: z.string(),
}));

export const getFeedbackResultsContract = z.object({
  subjectId: z.string(),
  totalRequests: z.number().int(),
  completedRequests: z.number().int(),
  avgRating: z.number().optional(),
  requests: z.array(z.object({
    id: z.number().int(),
    relationship: z.string(),
    status: z.string(),
  })),
  responses: z.array(z.object({
    requestId: z.number().int(),
    overallRating: z.number().int().optional(),
    submittedAt: z.string(),
    responses: z.array(z.object({
      questionId: z.string(),
      rating: z.number().int().optional(),
      text: z.string().optional(),
    })),
  })),
});
