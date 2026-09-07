"use client";
import type { z } from "zod";
import type { terminationItemContract as terminationItemContractDef } from "@/hooks/api/hr/termination-schema";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { invalidateHrWorkforceQueries } from "@/lib/hr-workforce-cache";

const terminationListContract = lazyContract(() =>
  import("@/hooks/api/hr/termination-schema").then((m) => m.terminationListContract),
);
const terminationItemContract = lazyContract(() =>
  import("@/hooks/api/hr/termination-schema").then((m) => m.terminationItemContract),
);
const terminationSuccessContract = lazyContract(() =>
  import("@/hooks/api/hr/termination-schema").then((m) => m.terminationSuccessContract),
);

interface TerminationEmployee {
  id: string;
  name: string | null;
  email: string;
  designation: string | null;
  employeeId: string | null;
}

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
}

export interface TerminationPagination {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface TerminationListResponse {
  data: Termination[];
  pagination: TerminationPagination;
  statusCounts: Record<string, number>;
}

export interface UseTerminationsParams {
  cursor?: string;
  limit?: number;
  status?: TerminationStatus;
}

const terminationKeys = {
  all: [...humanResourcesQueryKeys.hr.all, "termination"] as const,
  list: (
    params: Required<Omit<UseTerminationsParams, "status">> & {
      status: string;
    },
  ) => [...terminationKeys.all, "list", params] as const,
  detail: (terminationId: number) =>
    [...terminationKeys.all, "detail", terminationId] as const,
};

export function useTerminations(params: UseTerminationsParams = {}) {
  const canView = useCan("hr:exit:manage");
  const hrEnabled = useModuleEnabled("hr");
  const limit = params.limit ?? 20;
  const cursor = params.cursor ?? "";
  const search = new URLSearchParams({ limit: String(limit) });
  if (cursor) search.set("cursor", cursor);
  if (params.status) search.set("status", params.status);
  return useQuery({
    queryKey: terminationKeys.list({
      cursor,
      limit,
      status: params.status ?? "ALL",
    }),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/hr/termination?${search.toString()}`, undefined, signal, terminationListContract,
      ),
    enabled: hrEnabled && canView,
    staleTime: 2 * 60_000,
  });
}

export function useCreateTermination() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:manage", {
    mutationKey: [...terminationKeys.all, "create"],
    mutationFn: ({ employeeUserId, ...terminationInput }: CreateTerminationInput) =>
      apiClient.post("/hr/termination", {
        ...terminationInput,
        userId: employeeUserId,
      }, undefined, terminationItemContract),
    onSuccess: () => qc.invalidateQueries({ queryKey: terminationKeys.all }),
  });
}

export function useSubmitTermination() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:manage", {
    mutationKey: [...terminationKeys.all, "submit"],
    mutationFn: (terminationId: number) =>
      apiClient.patch(
        `/hr/termination/${terminationId}/submit`, undefined, undefined, terminationSuccessContract,
      ),
    onSuccess: (_, terminationId) => {
      void qc.invalidateQueries({ queryKey: terminationKeys.all });
      void qc.invalidateQueries({
        queryKey: terminationKeys.detail(terminationId),
      });
    },
  });
}

export function useFinalReviewTermination() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:approve", {
    mutationKey: [...terminationKeys.all, "final-review"],
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
      void qc.invalidateQueries({ queryKey: terminationKeys.all });
      void qc.invalidateQueries({
        queryKey: terminationKeys.detail(terminationId),
      });
      void invalidateHrWorkforceQueries(qc);
    },
  });
}

export function useSendTerminationEmail() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:manage", {
    mutationKey: [...terminationKeys.all, "send-email"],
    mutationFn: (terminationId: number) =>
      apiClient.post(
        `/hr/termination/${terminationId}/send-email`,
        {},
        undefined,
        terminationSuccessContract,
      ),
    onSuccess: (_, terminationId) => {
      void qc.invalidateQueries({ queryKey: terminationKeys.all });
      void qc.invalidateQueries({
        queryKey: terminationKeys.detail(terminationId),
      });
    },
  });
}

export function useCompleteTermination() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:exit:manage", {
    mutationKey: [...terminationKeys.all, "complete"],
    mutationFn: (terminationId: number) =>
      apiClient.patch(
        `/hr/termination/${terminationId}/complete`, undefined, undefined, terminationSuccessContract,
      ),
    onSuccess: (_, terminationId) => {
      void qc.invalidateQueries({ queryKey: terminationKeys.all });
      void qc.invalidateQueries({
        queryKey: terminationKeys.detail(terminationId),
      });
      void invalidateHrWorkforceQueries(qc);
    },
  });
}
