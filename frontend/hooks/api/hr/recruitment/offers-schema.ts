import { z } from "zod";

const candidateOfferRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  candidateId: z.number().int(),
  jobPostingId: z.number().int().nullable(),
  offeredBy: z.string().nullable(),
  offerStatus: z.string(),
  offeredSalary: z.string().nullable(),
  offeredDesignation: z.string().nullable(),
  joiningDate: z.string().nullable(),
  offerLetterUrl: z.string().nullable(),
  validUntil: z.string().nullable(),
  notes: z.string().nullable(),
  sentAt: z.string().nullable(),
  viewedAt: z.string().nullable(),
  respondedAt: z.string().nullable(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  approvalRemarks: z.string().nullable(),
  acceptanceToken: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const offerListItemSchema = z.object({
  id: z.number().int(),
  candidateId: z.number().int(),
  candidateFirstName: z.string(),
  candidateLastName: z.string(),
  candidateEmail: z.string(),
  jobPostingId: z.number().int().nullable(),
  jobTitle: z.string().nullable(),
  offerStatus: z.string(),
  offeredSalary: z.string().nullable(),
  offeredDesignation: z.string().nullable(),
  joiningDate: z.string().nullable(),
  validUntil: z.string().nullable(),
  sentAt: z.string().nullable(),
  respondedAt: z.string().nullable(),
  createdAt: z.string(),
});

const offerVersionRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  offerId: z.number().int(),
  versionNumber: z.number().int(),
  offeredSalary: z.string().nullable(),
  offeredDesignation: z.string().nullable(),
  joiningDate: z.string().nullable(),
  validUntil: z.string().nullable(),
  notes: z.string().nullable(),
  changeReason: z.string().nullable(),
  changedBy: z.string().nullable(),
  createdAt: z.string(),
});

const offerNegotiationRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  offerId: z.number().int(),
  direction: z.string(),
  proposedSalary: z.string().nullable(),
  proposedJoiningDate: z.string().nullable(),
  message: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
});

export const allOffersPageContract = z.object({
  items: z.array(offerListItemSchema),
  total: z.number().int(),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const candidateOffersListContract = z.array(candidateOfferRowSchema);

export const offerVersionsListContract = z.array(offerVersionRowSchema);

export const offerNegotiationsListContract = z.array(offerNegotiationRowSchema);

export const createCandidateOfferContract = candidateOfferRowSchema;

export const updateCandidateOfferContract = candidateOfferRowSchema;

export const deleteCandidateOfferContract = z.object({ success: z.literal(true) });

export const respondToNegotiationContract = offerNegotiationRowSchema;

export const submitOfferForApprovalContract = candidateOfferRowSchema;

export const approveOfferContract = candidateOfferRowSchema;

export const rejectOfferApprovalContract = candidateOfferRowSchema;
