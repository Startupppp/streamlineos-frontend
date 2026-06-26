"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface VaultDocument {
  id: number;
  candidateId: number;
  orgId: string;
  filename: string;
  s3Key: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  documentType: string | null;
  avResult: "PENDING" | "CLEAN" | "INFECTED" | null;
  expiresAt: string | null;
  uploadedBy: string;
  createdAt: string | null;
}

export type BgvStatus = "NOT_INITIATED" | "INITIATED" | "PENDING" | "CLEARED" | "FAILED";
export type VaultDocumentType = "AADHAR" | "PAN" | "PASSPORT" | "CERTIFICATE" | "OFFER_LETTER" | "OTHER";

export interface RolloutDocumentRecord {
  id: number;
  templateId: number | null;
  templateTitle: string | null;
  title: string;
  status: string;
  sentAt: string | null;
  viewedAt: string | null;
  signedAt: string | null;
  declinedAt: string | null;
  createdAt: string | null;
  createdBy: string;
}

export interface RolloutDocumentsInput {
  templateIds: number[];
  variables: Record<string, string>;
  sendEmail: boolean;
}

export interface RolloutDocumentsResult {
  documents: RolloutDocumentRecord[];
  count: number;
}

export interface UpdateBgvInput {
  bgvStatus: BgvStatus;
  bgvAgency?: string;
  bgvNotes?: string;
}

export interface VaultAccessLog {
  id: number;
  action: string;
  accessedAt: string | null;
  fileName: string;
  documentType: string | null;
  accessorDisplayName: string;
}

export interface BgvComplianceRow {
  jobPostingId: number;
  jobTitle: string;
  total: number;
  cleared: number;
  failed: number;
  pending: number;
  initiated: number;
  notInitiated: number;
  clearedPct: number;
}

export interface CandidateReferral {
  id: number;
  orgId: string;
  candidateId: number;
  referredBy: string;
  relationship: string | null;
  notes: string | null;
  bonusEligible: boolean;
  bonusAmount: string | null;
  bonusPaidAt: string | null;
  createdAt: string;
}

export interface CalibrationSession {
  id: number;
  orgId: string;
  candidateId: number;
  jobPostingId: number | null;
  scheduledAt: string | null;
  status: "pending" | "scheduled" | "completed" | "cancelled";
  notes: string | null;
  decision: "STRONG_HIRE" | "HIRE" | "NO_HIRE" | "HOLD" | null;
  participantIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceCheck {
  id: number;
  candidateId: number;
  orgId: string;
  referenceName: string;
  referenceDesignation: string | null;
  referenceCompany: string | null;
  referenceEmail: string | null;
  referencePhone: string | null;
  relationship: string | null;
  status: string;
  outcome: string | null;
  notes: string | null;
  contactedAt: string | null;
  createdBy: string | null;
  createdAt: string | null;
}

export interface CreateReferenceCheckInput {
  referenceName: string;
  referenceDesignation?: string;
  referenceCompany?: string;
  referenceEmail?: string;
  referencePhone?: string;
  relationship?: string;
  notes?: string;
}

export function useCandidateVault(candidateId: number) {
  return useQuery({
    queryKey: queryKeys.hr.candidateVault(candidateId),
    queryFn: () =>
      apiClient.get<VaultDocument[]>(`/hr/recruitment/candidates/${candidateId}/vault`),
    staleTime: 2 * 60_000,
    enabled: !!candidateId,
  });
}

export function useAddVaultDocument(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      filename: string;
      s3Key: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
      documentType?: VaultDocumentType;
    }) =>
      apiClient.post<VaultDocument>(`/hr/recruitment/candidates/${candidateId}/vault`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidateVault(candidateId) }),
  });
}

export function useDeleteVaultDocument(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: number) =>
      apiClient.delete<{ success: boolean }>(
        `/hr/recruitment/candidates/${candidateId}/vault/${documentId}`
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidateVault(candidateId) }),
  });
}

export function useRolloutDocuments(candidateId: number) {
  return useQuery({
    queryKey: queryKeys.hr.rolloutDocuments(candidateId),
    queryFn: () =>
      apiClient.get<RolloutDocumentRecord[]>(
        `/hr/recruitment/candidates/${candidateId}/rollout-documents`
      ),
    staleTime: 2 * 60_000,
    enabled: !!candidateId,
  });
}

export function useGenerateAndRollout(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RolloutDocumentsInput) =>
      apiClient.post<RolloutDocumentsResult>(
        `/hr/recruitment/candidates/${candidateId}/rollout-documents`,
        data
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.rolloutDocuments(candidateId) });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.candidateDocuments(candidateId) });
    },
  });
}

export function useUpdateCandidateBgv(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBgvInput) =>
      apiClient.patch<{ id: number; bgvStatus: BgvStatus }>(`/hr/recruitment/candidates/${candidateId}/bgv-status`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidate(candidateId) }),
  });
}

export function useVaultAccessLogs(candidateId: number) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "vaultAccessLogs", candidateId] as const,
    queryFn: () =>
      apiClient.get<VaultAccessLog[]>(
        `/hr/recruitment/candidates/${candidateId}/vault/access-logs`
      ),
    staleTime: 2 * 60_000,
    enabled: candidateId > 0,
  });
}

export function useBgvComplianceDashboard() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "bgv-compliance"],
    queryFn: () => apiClient.get<BgvComplianceRow[]>("/hr/recruitment/bgv-compliance"),
    staleTime: 2 * 60_000,
  });
}

export function useCandidateReferrals(candidateId: number) {
  return useQuery<CandidateReferral[]>({
    queryKey: [...queryKeys.hr.candidate(candidateId), "referrals"],
    queryFn: () =>
      apiClient.get<CandidateReferral[]>(`/hr/recruitment/candidates/${candidateId}/referral`),
    enabled: candidateId > 0,
  });
}

export function useCreateReferral(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      referredBy: string;
      relationship?: string;
      notes?: string;
      bonusEligible?: boolean;
      bonusAmount?: number;
    }) => apiClient.post<CandidateReferral>(`/hr/recruitment/candidates/${candidateId}/referral`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.candidate(candidateId), "referrals"] });
    },
  });
}

export function useUpdateReferral(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: number;
      bonusEligible?: boolean;
      bonusAmount?: number | null;
      bonusPaidAt?: string | null;
      notes?: string | null;
    }) => apiClient.patch<CandidateReferral>(`/hr/recruitment/candidates/${candidateId}/referral`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.candidate(candidateId), "referrals"] });
    },
  });
}

export function useCalibrationSessions(candidateId: number) {
  return useQuery<CalibrationSession[]>({
    queryKey: [...queryKeys.hr.candidate(candidateId), "calibration"],
    queryFn: () =>
      apiClient.get<CalibrationSession[]>(`/hr/recruitment/candidates/${candidateId}/calibration`),
    enabled: candidateId > 0,
  });
}

export function useCreateCalibration(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      jobPostingId?: number;
      scheduledAt?: string;
      participantIds?: string[];
      notes?: string;
    }) => apiClient.post<CalibrationSession>(`/hr/recruitment/candidates/${candidateId}/calibration`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.candidate(candidateId), "calibration"] });
    },
  });
}

export function useUpdateCalibration(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      id: number;
      scheduledAt?: string | null;
      status?: "pending" | "scheduled" | "completed" | "cancelled";
      notes?: string | null;
      decision?: "STRONG_HIRE" | "HIRE" | "NO_HIRE" | "HOLD" | null;
      participantIds?: string[];
    }) => apiClient.patch<CalibrationSession>(`/hr/recruitment/candidates/${candidateId}/calibration`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.candidate(candidateId), "calibration"] });
    },
  });
}

export function useReferenceChecks(candidateId: number) {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "referenceChecks", candidateId] as const,
    queryFn: () =>
      apiClient.get<ReferenceCheck[]>(`/hr/recruitment/candidates/${candidateId}/reference-checks`),
    staleTime: 2 * 60_000,
    enabled: candidateId > 0,
  });
}

export function useCreateReferenceCheck(candidateId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReferenceCheckInput) =>
      apiClient.post<ReferenceCheck>(
        `/hr/recruitment/candidates/${candidateId}/reference-checks`,
        data
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "referenceChecks", candidateId] }),
  });
}

export function useUpdateReferenceCheck(candidateId: number, checkId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DECLINED";
      outcome?: string | null;
      notes?: string | null;
      contactedAt?: string;
    }) =>
      apiClient.patch<{ success: boolean }>(
        `/hr/recruitment/candidates/${candidateId}/reference-checks/${checkId}`,
        data
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "referenceChecks", candidateId] }),
  });
}

export function useDeleteReferenceCheck(candidateId: number, checkId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.delete<{ success: boolean }>(
        `/hr/recruitment/candidates/${candidateId}/reference-checks/${checkId}`
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.hr.all, "referenceChecks", candidateId] }),
  });
}
