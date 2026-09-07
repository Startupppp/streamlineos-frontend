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

export function useEmailSequences() {
  return useGatedQuery("hr:employees:view", {
    queryKey: humanResourcesQueryKeys.hr.emailSequences(),
    queryFn: ({ signal }) => apiClient.get<EmailSequence[]>("/hr/recruitment/email-sequences", undefined, signal, emailSequenceListContract),
    staleTime: 2 * 60_000,
  });
}

export function useCreateEmailSequence() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "email-sequences", "create"],
    mutationFn: (data: CreateEmailSequenceInput) =>
      apiClient.post<EmailSequence>("/hr/recruitment/email-sequences", data, undefined, emailSequenceWithStepsContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.emailSequences() });
    },
  });
}

export function useUpdateEmailSequence(id: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "email-sequences", "update", id],
    mutationFn: (data: UpdateEmailSequenceInput) =>
      apiClient.patch<EmailSequence>(`/hr/recruitment/email-sequences/${id}`, data, undefined, emailSequenceWithStepsContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.emailSequences() });
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.emailSequence(id) });
    },
  });
}

export function useDeleteEmailSequence() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "email-sequences", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/email-sequences/${id}`, undefined, undefined, emailSequenceSuccessContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.emailSequences() });
    },
  });
}

