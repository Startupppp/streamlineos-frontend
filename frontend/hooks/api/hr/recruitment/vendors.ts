"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const vendorRowC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/vendors-schema").then((m) => m.vendorRowContract),
);
const vendorListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/vendors-schema").then((m) => m.vendorListContract),
);
const vendorSubmissionListC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/vendors-schema").then(
    (m) => m.vendorSubmissionListContract,
  ),
);
const vendorSubmissionRowC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/vendors-schema").then((m) => m.vendorSubmissionRowContract),
);
const vendorPortalLinkC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/vendors-schema").then((m) => m.vendorPortalLinkContract),
);

export type VendorStatus = "ACTIVE" | "INACTIVE";
export type VendorPlacementStatus = "SUBMITTED" | "INTERVIEWING" | "PLACED" | "REJECTED";
export type VendorInvoiceStatus = "NOT_INVOICED" | "INVOICED" | "PAID";
export type VendorContractType = "CONTINGENCY" | "CONTRACT_STAFFING" | "BOTH";

export interface RecruitmentVendor {
  id: number;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  feePercent: string | null;
  status: VendorStatus;
  /**
   * Absent on the list route — `listVendors` does not select these three, so a
   * card or sheet opened from the list has no value to render or prefill.
   */
  contractType?: VendorContractType;
  slaDays?: number | null;
  replacementGuaranteeDays?: number | null;
  createdAt: string;
  submissionCount: number;
  placements: number;
  revenueTotal: string;
}

/** The full `recruitment_vendors` row a create/update returns — no aggregates. */
export interface RecruitmentVendorRow {
  id: number;
  orgId: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  feePercent: string | null;
  status: string;
  contractType: string;
  slaDays: number | null;
  replacementGuaranteeDays: number | null;
  portalToken: string | null;
  portalTokenExpiresAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorPortalLink {
  portalToken: string | null;
  portalTokenExpiresAt: string | null;
}

export interface VendorSubmission {
  id: number;
  candidateId: number;
  jobPostingId: number | null;
  submittedAt: string;
  placementStatus: VendorPlacementStatus;
  invoiceStatus: VendorInvoiceStatus;
  invoiceAmount: string | null;
  invoiceDate: string | null;
  paidAt: string | null;
  billRate: string | null;
  payRate: string | null;
  margin: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  candidateFirstName: string | null;
  candidateLastName: string | null;
  candidateEmail: string | null;
  jobTitle: string | null;
}

/** The raw `vendor_candidate_submissions` row a create/update returns. */
export interface VendorSubmissionRow {
  id: number;
  orgId: string;
  vendorId: number;
  candidateId: number;
  jobPostingId: number | null;
  submittedAt: string;
  placementStatus: string;
  invoiceStatus: string;
  invoiceAmount: string | null;
  invoiceDate: string | null;
  paidAt: string | null;
  billRate: string | null;
  payRate: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  createdAt: string;
}

export interface CreateVendorInput {
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  feePercent?: number;
  status?: VendorStatus;
  contractType?: VendorContractType;
  slaDays?: number;
  replacementGuaranteeDays?: number;
}

export interface UpdateVendorInput {
  name?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  feePercent?: number;
  status?: VendorStatus;
  contractType?: VendorContractType;
  slaDays?: number;
  replacementGuaranteeDays?: number;
}

export interface CreateSubmissionInput {
  candidateId: number;
  jobPostingId?: number;
  billRate?: number;
  payRate?: number;
  contractStartDate?: string;
  contractEndDate?: string;
}

export interface UpdateSubmissionInput {
  placementStatus?: VendorPlacementStatus;
  invoiceStatus?: VendorInvoiceStatus;
  invoiceAmount?: number;
  invoiceDate?: string;
  paidAt?: string;
  billRate?: number;
  payRate?: number;
  contractStartDate?: string;
  contractEndDate?: string;
}

export function useRecruitmentVendors() {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: humanResourcesQueryKeys.hr.recruitmentVendors(),
    queryFn: ({ signal }) =>
      apiClient.get<RecruitmentVendor[]>("/hr/recruitment/vendors", undefined, signal, vendorListC),
    staleTime: 2 * 60_000,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "vendors", "create"],
    mutationFn: (data: CreateVendorInput) =>
      apiClient.post<RecruitmentVendorRow>("/hr/recruitment/vendors", data, undefined, vendorRowC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentVendors() });
    },
  });
}

export function useUpdateVendor(vendorId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "vendors", "update", vendorId],
    mutationFn: (data: UpdateVendorInput) =>
      apiClient.patch<RecruitmentVendorRow>(
        `/hr/recruitment/vendors/${vendorId}`,
        data,
        undefined,
        vendorRowC,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentVendors() });
    },
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "vendors", "delete"],
    mutationFn: (vendorId: number) =>
      apiClient.delete<void>(
        `/hr/recruitment/vendors/${vendorId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentVendors() });
    },
  });
}

export function useVendorSubmissions(vendorId: number) {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: humanResourcesQueryKeys.hr.vendorSubmissions(vendorId),
    queryFn: ({ signal }) =>
      apiClient.get<VendorSubmission[]>(
        `/hr/recruitment/vendors/${vendorId}/submissions`,
        undefined,
        signal,
        vendorSubmissionListC,
      ),
    enabled: vendorId > 0,
    staleTime: 60_000,
  });
}

export function useCreateVendorSubmission(vendorId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "vendor-submissions", "create", vendorId],
    mutationFn: (data: CreateSubmissionInput) =>
      apiClient.post<VendorSubmissionRow>(
        `/hr/recruitment/vendors/${vendorId}/submissions`,
        data,
        undefined,
        vendorSubmissionRowC,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.vendorSubmissions(vendorId) });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentVendors() });
    },
  });
}

export function useUpdateVendorSubmission(vendorId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "vendor-submissions", "update", vendorId],
    mutationFn: ({ submissionId, ...data }: UpdateSubmissionInput & { submissionId: number }) =>
      apiClient.patch<VendorSubmissionRow>(
        `/hr/recruitment/vendors/${vendorId}/submissions?submissionId=${submissionId}`,
        data,
        undefined,
        vendorSubmissionRowC,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.vendorSubmissions(vendorId) });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.recruitmentVendors() });
    },
  });
}

export function useGenerateVendorPortalLink(vendorId: number) {
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "vendors", "portal-link", vendorId],
    mutationFn: () =>
      apiClient.post<VendorPortalLink>(
        `/hr/recruitment/vendors/${vendorId}/portal-link`,
        undefined,
        undefined,
        vendorPortalLinkC,
      ),
  });
}
