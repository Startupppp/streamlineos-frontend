"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  EmailSequence,
  CreateEmailSequenceInput,
  UpdateEmailSequenceInput,
} from "@/types/hr/recruitment";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { z } from "zod";
import type { nurtureMetricsContract } from "@/hooks/api/hr/recruitment/email-sequences-schema";

export type NurtureMetrics = z.infer<typeof nurtureMetricsContract>;

const emailSequenceListContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/email-sequences-schema").then(
    (m) => m.emailSequenceListSchema,
  ),
);
const emailSequenceWithStepsContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/email-sequences-schema").then(
    (m) => m.emailSequenceWithStepsSchema,
  ),
);
const emailSequenceSuccessContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/email-sequences-schema").then(
    (m) => m.emailSequenceSuccessSchema,
  ),
);
const nurtureMetricsC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/email-sequences-schema").then(
    (m) => m.nurtureMetricsContract,
  ),
);

/**
 * What a campaign actually did, gated on `view` to match the route.
 *
 * A short `staleTime`: these numbers move whenever the sender ticks, and a
 * recruiter watching a campaign they just launched reads a stale zero as the
 * campaign not working.
 */
export function useEmailSequenceMetrics(emailSequenceId: number, enabled = true) {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: humanResourcesQueryKeys.hr.emailSequenceMetrics(emailSequenceId),
    queryFn: ({ signal }) =>
      apiClient.get<NurtureMetrics>(
        `/hr/recruitment/email-sequences/${emailSequenceId}/metrics`,
        undefined,
        signal,
        nurtureMetricsC,
      ),
    staleTime: 15_000,
    enabled,
  });
}

export function useEmailSequences() {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: humanResourcesQueryKeys.hr.emailSequences(),
    queryFn: ({ signal }) => apiClient.get<EmailSequence[]>("/hr/recruitment/email-sequences", undefined, signal, emailSequenceListContract),
    staleTime: 2 * 60_000,
  });
}

export function useCreateEmailSequence() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "email-sequences", "create"],
    mutationFn: (data: CreateEmailSequenceInput) =>
      apiClient.post<EmailSequence>("/hr/recruitment/email-sequences", data, undefined, emailSequenceWithStepsContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.emailSequences() });
    },
  });
}

export function useUpdateEmailSequence(emailSequenceId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "email-sequences", "update", emailSequenceId],
    mutationFn: (data: UpdateEmailSequenceInput) =>
      apiClient.patch<EmailSequence>(`/hr/recruitment/email-sequences/${emailSequenceId}`, data, undefined, emailSequenceWithStepsContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.emailSequences() });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.emailSequence(emailSequenceId) });
    },
  });
}

export function useDeleteEmailSequence() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "email-sequences", "delete"],
    mutationFn: (emailSequenceId: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/email-sequences/${emailSequenceId}`, undefined, undefined, emailSequenceSuccessContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.emailSequences() });
    },
  });
}

