"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const activityContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidate-details-schema").then(
    (m) => m.candidateActivityEventListSchema,
  ),
);
const vaultDocumentListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidate-details-schema").then(
    (m) => m.vaultDocumentListSchema,
  ),
);
const vaultDocumentContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidate-details-schema").then(
    (m) => m.vaultDocumentSchema,
  ),
);
const rolloutDocumentListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidate-details-schema").then(
    (m) => m.rolloutDocumentListSchema,
  ),
);
const generateRolloutContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidate-details-schema").then(
    (m) => m.generateRolloutResponseSchema,
  ),
);
const bgvSuccessContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidate-details-schema").then(
    (m) => m.bgvUpdateSuccessSchema,
  ),
);
const vaultAccessLogListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidate-details-schema").then(
    (m) => m.vaultAccessLogListSchema,
  ),
);
const bgvComplianceListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidate-details-schema").then(
    (m) => m.bgvComplianceListSchema,
  ),
);
const referralListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidate-details-schema").then(
    (m) => m.candidateReferralListSchema,
  ),
);
const referralContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidate-details-schema").then(
    (m) => m.candidateReferralSchema,
  ),
);
const calibrationListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidate-details-schema").then(
    (m) => m.calibrationSessionListSchema,
  ),
);
const calibrationContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidate-details-schema").then(
    (m) => m.calibrationSessionSchema,
  ),
);
const referenceCheckListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidate-details-schema").then(
    (m) => m.referenceCheckListSchema,
  ),
);
const referenceCheckContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/candidate-details-schema").then(
    (m) => m.referenceCheckSchema,
  ),
);

import type {
  BgvComplianceRow,
  CalibrationSession,
  CandidateActivityEvent,
  CandidateDocumentRecord,
  CandidateReferral,
  CreateReferenceCheckInput,
  ReferenceCheck,
  RolloutDocumentRecord,
  RolloutDocumentsInput,
  RolloutDocumentsResult,
  UpdateBgvInput,
  VaultAccessLog,
  VaultDocument,
  VaultDocumentType,
} from "@/hooks/api/hr/recruitment/candidate-details-types";

export type {
  BgvComplianceRow,
  BgvStatus,
  CandidateActivityEvent,
  CandidateDocumentRecord,
  RolloutDocumentRecord,
  RolloutDocumentsInput,
  VaultDocumentType,
} from "@/hooks/api/hr/recruitment/candidate-details-types";

export function useCandidateActivity(candidateId: number) {
  const canView = useCan("hr:requisitions:view");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.candidate(candidateId), "activity"],
    queryFn: ({ signal }) => apiClient.get<CandidateActivityEvent[]>(`/hr/recruitment/candidates/${candidateId}/activity`, undefined, signal, activityContract),
    staleTime: 60_000,
    enabled: canView && !!candidateId,
  });
}

export function useCandidateVault(candidateId: number) {
  const canViewVault = useCan("hr:requisitions:manage");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.candidateVault(candidateId),
    queryFn: ({ signal }) =>
      apiClient.get<VaultDocument[]>(`/hr/recruitment/candidates/${candidateId}/vault`, undefined, signal, vaultDocumentListContract),
    staleTime: 2 * 60_000,
    enabled: canViewVault && !!candidateId,
  });
}

export function useAddVaultDocument(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "vault", "add", candidateId],
    mutationFn: (data: {
      filename: string;
      s3Key: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
      documentType?: VaultDocumentType;
    }) =>
      apiClient.post<VaultDocument>(`/hr/recruitment/candidates/${candidateId}/vault`, data, undefined, vaultDocumentContract),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidateVault(candidateId) }),
  });
}

export function useDeleteVaultDocument(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "vault", "delete", candidateId],
    mutationFn: (documentId: number) =>
      apiClient.delete<void>(
        `/hr/recruitment/candidates/${candidateId}/vault/${documentId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidateVault(candidateId) }),
  });
}

export function useRolloutDocuments(candidateId: number) {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: humanResourcesQueryKeys.hr.rolloutDocuments(candidateId),
    queryFn: ({ signal }) =>
      apiClient.get<RolloutDocumentRecord[]>(
        `/hr/recruitment/candidates/${candidateId}/rollout-documents`,
        undefined,
        signal,
        rolloutDocumentListContract,
      ),
    staleTime: 2 * 60_000,
    enabled: !!candidateId,
  });
}

export function useGenerateAndRollout(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "rollout-documents", candidateId],
    mutationFn: (data: RolloutDocumentsInput) =>
      apiClient.post<RolloutDocumentsResult>(
        `/hr/recruitment/candidates/${candidateId}/rollout-documents`,
        data,
        undefined,
        generateRolloutContract,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.rolloutDocuments(candidateId) });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidateDocuments(candidateId) });
    },
  });
}

export function useUpdateCandidateBgv(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "candidates", "bgv", candidateId],
    mutationFn: (data: UpdateBgvInput) =>
      apiClient.patch<{ success: true }>(
        `/hr/recruitment/candidates/${candidateId}/bgv-status`,
        data,
        undefined,
        bgvSuccessContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.candidate(candidateId) }),
  });
}

export function useVaultAccessLogs(candidateId: number) {
  return useGatedQuery("hr:requisitions:manage", {
    queryKey: [...humanResourcesQueryKeys.hr.all, "vaultAccessLogs", candidateId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<VaultAccessLog[]>(
        `/hr/recruitment/candidates/${candidateId}/vault/access-logs`,
        undefined,
        signal,
        vaultAccessLogListContract,
      ),
    staleTime: 2 * 60_000,
    enabled: candidateId > 0,
  });
}

export function useBgvComplianceDashboard() {
  const canSensitive = useCan("hr:sensitive:view");
  return useQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "bgv-compliance"],
    queryFn: ({ signal }) => apiClient.get<BgvComplianceRow[]>("/hr/recruitment/bgv-compliance", undefined, signal, bgvComplianceListContract),
    staleTime: 2 * 60_000,
    enabled: canSensitive,
  });
}

export function useCandidateReferrals(candidateId: number) {
  const canView = useCan("hr:requisitions:view");
  return useQuery<CandidateReferral[]>({
    queryKey: [...humanResourcesQueryKeys.hr.candidate(candidateId), "referrals"],
    queryFn: ({ signal }) =>
      apiClient.get<CandidateReferral[]>(`/hr/recruitment/candidates/${candidateId}/referral`, undefined, signal, referralListContract),
    enabled: canView && candidateId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCreateReferral(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "referrals", "create", candidateId],
    mutationFn: (data: {
      referredBy: string;
      relationship?: string;
      notes?: string;
      bonusEligible?: boolean;
      bonusAmount?: number;
    }, idempotencyKey: string) => apiClient.post<CandidateReferral>(`/hr/recruitment/candidates/${candidateId}/referral`, data, { headers: { "Idempotency-Key": idempotencyKey } }, referralContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.candidate(candidateId), "referrals"] });
    },
  });
}

export function useUpdateReferral(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "referrals", "update", candidateId],
    mutationFn: (data: {
      id: number;
      bonusEligible?: boolean;
      bonusAmount?: number | null;
      bonusPaidAt?: string | null;
      notes?: string | null;
    }) => apiClient.patch<CandidateReferral>(`/hr/recruitment/candidates/${candidateId}/referral`, data, undefined, referralContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.candidate(candidateId), "referrals"] });
    },
  });
}

export function useCalibrationSessions(candidateId: number) {
  return useGatedQuery<CalibrationSession[]>("hr:requisitions:view", {
    queryKey: [...humanResourcesQueryKeys.hr.candidate(candidateId), "calibration"],
    queryFn: ({ signal }) =>
      apiClient.get<CalibrationSession[]>(`/hr/recruitment/candidates/${candidateId}/calibration`, undefined, signal, calibrationListContract),
    enabled: candidateId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useCreateCalibration(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "calibration", "create", candidateId],
    mutationFn: (data: {
      jobPostingId?: number;
      scheduledAt?: string;
      participantIds?: string[];
      notes?: string;
    }) => apiClient.post<CalibrationSession>(`/hr/recruitment/candidates/${candidateId}/calibration`, data, undefined, calibrationContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.candidate(candidateId), "calibration"] });
    },
  });
}

export function useUpdateCalibration(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "calibration", "update", candidateId],
    mutationFn: (data: {
      id: number;
      scheduledAt?: string | null;
      status?: "pending" | "scheduled" | "completed" | "cancelled";
      notes?: string | null;
      decision?: "STRONG_HIRE" | "HIRE" | "NO_HIRE" | "HOLD" | null;
      participantIds?: string[];
    }) => apiClient.patch<CalibrationSession>(`/hr/recruitment/candidates/${candidateId}/calibration`, data, undefined, calibrationContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.candidate(candidateId), "calibration"] });
    },
  });
}

export function useReferenceChecks(candidateId: number) {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: [...humanResourcesQueryKeys.hr.all, "referenceChecks", candidateId] as const,
    queryFn: ({ signal }) =>
      apiClient.get<ReferenceCheck[]>(`/hr/recruitment/candidates/${candidateId}/reference-checks`, undefined, signal, referenceCheckListContract),
    staleTime: 2 * 60_000,
    enabled: candidateId > 0,
  });
}

export function useCreateReferenceCheck(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "reference-checks", "create", candidateId],
    mutationFn: (data: CreateReferenceCheckInput) =>
      apiClient.post<ReferenceCheck>(
        `/hr/recruitment/candidates/${candidateId}/reference-checks`,
        data,
        undefined,
        referenceCheckContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "referenceChecks", candidateId] }),
  });
}

export function useUpdateReferenceCheck(candidateId: number, checkId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "reference-checks", "update", candidateId, checkId],
    mutationFn: (data: {
      status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DECLINED";
      outcome?: string | null;
      notes?: string | null;
      contactedAt?: string;
    }) =>
      apiClient.patch<ReferenceCheck>(
        `/hr/recruitment/candidates/${candidateId}/reference-checks/${checkId}`,
        data,
        undefined,
        referenceCheckContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "referenceChecks", candidateId] }),
  });
}

export function useDeleteReferenceCheck(candidateId: number, checkId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "reference-checks", "delete", candidateId, checkId],
    mutationFn: () =>
      apiClient.delete<void>(
        `/hr/recruitment/candidates/${candidateId}/reference-checks/${checkId}`,
        undefined,
        undefined,
        noContentContract,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...humanResourcesQueryKeys.hr.all, "referenceChecks", candidateId] }),
  });
}
