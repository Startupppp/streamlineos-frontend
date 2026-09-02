"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  EmailSequence,
  CreateEmailSequenceInput,
  UpdateEmailSequenceInput,
} from "@/types/hr/recruitment";

export function useEmailSequences() {
  return useQuery({
    queryKey: queryKeys.hr.emailSequences(),
    queryFn: ({ signal }) => apiClient.get<EmailSequence[]>("/hr/recruitment/email-sequences", undefined, signal),
    staleTime: 2 * 60_000,
  });
}

export function useCreateEmailSequence() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "email-sequences", "create"],
    mutationFn: (data: CreateEmailSequenceInput) =>
      apiClient.post<EmailSequence>("/hr/recruitment/email-sequences", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.emailSequences() });
    },
  });
}

export function useUpdateEmailSequence(id: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "email-sequences", "update", id],
    mutationFn: (data: UpdateEmailSequenceInput) =>
      apiClient.patch<EmailSequence>(`/hr/recruitment/email-sequences/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.emailSequences() });
      void qc.invalidateQueries({ queryKey: queryKeys.hr.emailSequence(id) });
    },
  });
}

export function useDeleteEmailSequence() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:employees:manage", {
    mutationKey: ["hr", "recruitment", "email-sequences", "delete"],
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/email-sequences/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.emailSequences() });
    },
  });
}

