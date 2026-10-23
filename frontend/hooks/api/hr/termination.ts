"use client";
import type { z } from "zod";
import type { terminationItemContract as terminationItemContractDef } from "@/hooks/api/hr/termination-schema";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { terminationListQueryOptions } from "./termination-read-options";
import { invalidateHrWorkforceQueries } from "@/lib/hr-workforce-cache";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";

const terminationListContract = lazyContract(() =>
  import("@/hooks/api/hr/termination-schema").then((m) => m.terminationListContract),
);
const terminationRowContract = lazyContract(() =>
  import("@/hooks/api/hr/termination-schema").then((m) => m.terminationRowContract),
);
const terminationCandidateContract = lazyContract(() =>
  import("@/hooks/api/hr/termination-schema").then((m) => m.terminationCandidateContract),
);
const terminationSuccessContract = lazyContract(() =>
  import("@/hooks/api/hr/termination-schema").then((m) => m.terminationSuccessContract),
);

export type TerminationStatus =
  | "DRAFT"
  | "PENDING_FINAL"
  | "APPROVED"
  | "REJECTED"
  | "SENT"
  | "COMPLETED";

export type Termination = z.infer<typeof terminationItemContractDef>;

interface CreateTerminationInput {
  employeeUserId: string;
  reasons: string[];
  detailedExplanation: string;
  effectiveDate: string;
  severanceAmount?: number;
  noticePeriodWaived?: boolean;
  internalNotes?: string;
  saveAsDraft?: boolean;
}

export interface TerminationPagination {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface UseTerminationsParams {
  cursor?: string;
  limit?: number;
  status?: TerminationStatus;
}

export function useTerminations(params: UseTerminationsParams = {}) {
  const canView = useCan("hr:exit:manage");
  const hrEnabled = useModuleEnabled("hr");
  const limit = params.limit ?? 20;
  const cursor = params.cursor ?? "";
  const search = new URLSearchParams({ limit: String(limit) });
  if (cursor) search.set("cursor", cursor);
  if (params.status) search.set("status", params.status);
  return useQuery({
    ...terminationListQueryOptions({ cursor, limit, status: params.status ?? "ALL" }),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/hr/termination?${search.toString()}`, undefined, signal, terminationListContract,
      ),
    enabled: hrEnabled && canView,
  });
}

export function useTerminationCandidate(employeeUserId: string | null) {
  const canView = useCan("hr:employees:view");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.terminationCandidate(employeeUserId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.get(`/hr/employees/${employeeUserId ?? ""}`, undefined, signal, terminationCandidateContract),
    enabled: hrEnabled && canView && !!employeeUserId,
    staleTime: 60_000,
  });
}

export function useCreateTermination() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("hr:exit:manage", {
    mutationKey: [...humanResourcesQueryKeys.hr.terminationAll, "create"],
    mutationFn: ({ employeeUserId, ...terminationInput }: CreateTerminationInput) => {
      const body = { ...terminationInput, userId: employeeUserId };
      return apiClient.post("/hr/termination", body, operation.configFor(body), terminationRowContract);
    },
    onSuccess: (created) => {
      operation.settle();
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.terminationAll });
      if (created.status === "COMPLETED") void invalidateHrWorkforceQueries(qc, created.userId);
    },
  });
}

export function useRehireEmployee() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("hr:exit:manage", {
    mutationKey: [...humanResourcesQueryKeys.hr.terminationAll, "rehire"],
    mutationFn: ({ employeeUserId, joiningDate }: { employeeUserId: string; joiningDate: string }) =>
      apiClient.post(
        `/hr/employees/${employeeUserId}/rehire`,
        { joiningDate },
        operation.configFor({ employeeUserId, joiningDate }),
        terminationSuccessContract,
      ),
    onSuccess: (_, { employeeUserId }) => {
      operation.settle();
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.terminationAll });
      void invalidateHrWorkforceQueries(qc, employeeUserId);
    },
  });
}

export function useArchiveEmployee() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("hr:exit:manage", {
    mutationKey: [...humanResourcesQueryKeys.hr.terminationAll, "archive"],
    mutationFn: ({ employeeUserId, reason }: { employeeUserId: string; reason?: string }) =>
      apiClient.post(
        `/hr/employees/${employeeUserId}/archive`,
        { reason },
        operation.configFor({ employeeUserId, reason }),
        terminationSuccessContract,
      ),
    onSuccess: (_, { employeeUserId }) => {
      operation.settle();
      void invalidateHrWorkforceQueries(qc, employeeUserId);
    },
  });
}

export function useSubmitTermination() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:manage", {
    mutationKey: [...humanResourcesQueryKeys.hr.terminationAll, "submit"],
    mutationFn: (terminationId: number) =>
      apiClient.patch(
        `/hr/termination/${terminationId}/submit`, undefined, undefined, terminationSuccessContract,
      ),
    onSuccess: (_, terminationId) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.terminationAll });
      void qc.invalidateQueries({
        queryKey: humanResourcesQueryKeys.hr.terminationDetail(terminationId),
      });
    },
  });
}

export function useFinalReviewTermination() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:approve", {
    mutationKey: [...humanResourcesQueryKeys.hr.terminationAll, "final-review"],
    mutationFn: ({
      terminationId,
      decision,
      remarks,
    }: {
      terminationId: number;
      decision: "approve" | "reject";
      remarks?: string;
    }) =>
      apiClient.patch(
        `/hr/termination/${terminationId}/final-review`,
        { decision, remarks },
        undefined,
        terminationSuccessContract,
      ),
    onSuccess: (_, { terminationId }) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.terminationAll });
      void qc.invalidateQueries({
        queryKey: humanResourcesQueryKeys.hr.terminationDetail(terminationId),
      });
      void invalidateHrWorkforceQueries(qc);
    },
  });
}

export function useSendTerminationEmail() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:manage", {
    mutationKey: [...humanResourcesQueryKeys.hr.terminationAll, "send-email"],
    mutationFn: (terminationId: number) =>
      apiClient.post(
        `/hr/termination/${terminationId}/send-email`,
        {},
        undefined,
        terminationSuccessContract,
      ),
    onSuccess: (_, terminationId) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.terminationAll });
      void qc.invalidateQueries({
        queryKey: humanResourcesQueryKeys.hr.terminationDetail(terminationId),
      });
    },
  });
}

export function useCompleteTermination() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:manage", {
    mutationKey: [...humanResourcesQueryKeys.hr.terminationAll, "complete"],
    mutationFn: ({ terminationId }: { terminationId: number; userId: string }) =>
      apiClient.patch(
        `/hr/termination/${terminationId}/complete`, undefined, undefined, terminationSuccessContract,
      ),
    onSuccess: (_, { terminationId, userId }) => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.terminationAll });
      void qc.invalidateQueries({
        queryKey: humanResourcesQueryKeys.hr.terminationDetail(terminationId),
      });
      void invalidateHrWorkforceQueries(qc, userId);
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.fnfList() });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.assetReturnsList() });
    },
  });
}
