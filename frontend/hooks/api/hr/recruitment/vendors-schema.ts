import { z } from "zod";

export const vendorRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  website: z.string().nullable(),
  feePercent: z.string().nullable(),
  status: z.string(),
  contractType: z.string(),
  slaDays: z.number().int().nullable(),
  replacementGuaranteeDays: z.number().int().nullable(),
  portalToken: z.string().nullable(),
  portalTokenExpiresAt: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const vendorPortalLinkContract = z.object({
  portalToken: z.string().nullable(),
  portalTokenExpiresAt: z.string().nullable(),
});

export const vendorSubmissionContract = z.object({
  id: z.number().int(),
  candidateId: z.number().int(),
  jobPostingId: z.number().int().nullable(),
  submittedAt: z.string(),
  placementStatus: z.enum(["SUBMITTED", "INTERVIEWING", "PLACED", "REJECTED"]),
  invoiceStatus: z.enum(["NOT_INVOICED", "INVOICED", "PAID"]),
  invoiceAmount: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  paidAt: z.string().nullable(),
  billRate: z.string().nullable(),
  payRate: z.string().nullable(),
  margin: z.string().nullable(),
  contractStartDate: z.string().nullable(),
  contractEndDate: z.string().nullable(),
  candidateFirstName: z.string().nullable(),
  candidateLastName: z.string().nullable(),
  candidateEmail: z.string().nullable(),
  jobTitle: z.string().nullable(),
});

export const vendorSubmissionListContract = z.array(vendorSubmissionContract);

export const vendorSubmissionRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  vendorId: z.number().int(),
  candidateId: z.number().int(),
  jobPostingId: z.number().int().nullable(),
  submittedAt: z.string(),
  placementStatus: z.string(),
  invoiceStatus: z.string(),
  invoiceAmount: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  paidAt: z.string().nullable(),
  billRate: z.string().nullable(),
  payRate: z.string().nullable(),
  contractStartDate: z.string().nullable(),
  contractEndDate: z.string().nullable(),
  createdAt: z.string(),
});

/**
 * `RecruitmentVendorSourcingService.listVendors` projects ten columns plus three
 * aggregates. It does NOT select `contractType`, `slaDays` or
 * `replacementGuaranteeDays`, so this list type cannot carry them.
 */
export const vendorListContract = z.array(
  z.object({
    id: z.number().int(),
    name: z.string(),
    contactName: z.string().nullable(),
    contactEmail: z.string().nullable(),
    contactPhone: z.string().nullable(),
    website: z.string().nullable(),
    feePercent: z.string().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    createdAt: z.string(),
    submissionCount: z.number().int(),
    placements: z.number().int(),
    revenueTotal: z.string(),
  }),
);
