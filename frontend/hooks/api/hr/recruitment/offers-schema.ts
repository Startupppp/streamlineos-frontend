import { z } from "zod";

/**
 * The six structured CTC columns. Every one is nullable and stays nullable all
 * the way to the screen: null means nobody entered it, "0.00" means the offer
 * states there is none of it, and a reader that collapses the two shows a
 * candidate a guaranteed-zero bonus the company never promised either way.
 */
const ctcBreakdownFields = {
  ctcFixed: z.string().nullable(),
  ctcVariable: z.string().nullable(),
  ctcJoiningBonus: z.string().nullable(),
  ctcEquityValue: z.string().nullable(),
  ctcEmployerPf: z.string().nullable(),
  ctcGratuity: z.string().nullable(),
};

/**
 * Summed and divided into months by the backend, never here. Adding these
 * decimals up in JavaScript would be a second money implementation in floating
 * point, showing a total the backend never agreed to.
 */
const ctcPreviewSchema = z.object({
  lines: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      recurrence: z.enum(["MONTHLY", "LUMP_SUM"]),
      annual: z.string(),
      monthly: z.string().nullable(),
    }),
  ),
  annualTotal: z.string().nullable(),
  monthlyTotal: z.string().nullable(),
  lumpSumTotal: z.string().nullable(),
  malformed: z.array(z.string()),
  /** Recruiter-only: what will block approval, before they find out by clicking it. */
  reconciliation: z.object({
    status: z.enum(["MATCHED", "MISMATCHED", "NOT_COMPARABLE"]),
    difference: z.string().nullable(),
    message: z.string().nullable(),
  }),
});

const candidateOfferRowSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  candidateId: z.number().int(),
  jobPostingId: z.number().int().nullable(),
  offeredBy: z.string().nullable(),
  offerStatus: z.string(),
  offeredSalary: z.string().nullable(),
  offeredDesignation: z.string().nullable(),
  ...ctcBreakdownFields,
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

/**
 * Only the LIST route carries a preview — it is computed per row on the way out,
 * where the single-offer routes return the row the write produced. Extending
 * here rather than making `ctcPreview` optional on the row keeps the contract
 * able to say which is which; an optional field on both could never fail.
 */
export const candidateOffersListContract = z.array(
  candidateOfferRowSchema.extend({ ctcPreview: ctcPreviewSchema }),
);

export const offerVersionsListContract = z.array(offerVersionRowSchema);

export const offerNegotiationsListContract = z.array(offerNegotiationRowSchema);

export const createCandidateOfferContract = candidateOfferRowSchema;

export const updateCandidateOfferContract = candidateOfferRowSchema;

export const deleteCandidateOfferContract = z.object({ success: z.literal(true) });

export const respondToNegotiationContract = offerNegotiationRowSchema;

export const submitOfferForApprovalContract = candidateOfferRowSchema;

export const approveOfferContract = candidateOfferRowSchema;

export const rejectOfferApprovalContract = candidateOfferRowSchema;
