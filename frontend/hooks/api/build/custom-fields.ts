"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  ProjectCustomField,
  TicketCustomFieldValue,
  CustomFieldType,
} from "@/types/projects/tasks";

function customFieldKeys(projectId: number) {
  return ["projects", projectId, "custom-fields"] as const;
}

function ticketCustomFieldValueKeys(projectId: number, ticketId: number) {
  return ["projects", projectId, "tickets", ticketId, "custom-field-values"] as const;
}

export function useProjectCustomFields(projectId: number) {
  return useQuery<ProjectCustomField[]>({
    queryKey: customFieldKeys(projectId),
    queryFn: () =>
      apiClient.get<ProjectCustomField[]>(`/build/${projectId}/custom-fields`),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateProjectCustomField(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "custom-fields", "create"],
    mutationFn: (data: {
      name: string;
      type: CustomFieldType;
      options?: string[] | null;
      required?: boolean;
    }) =>
      apiClient.post<ProjectCustomField>(
        `/build/${projectId}/custom-fields`,
        data,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: customFieldKeys(projectId) }),
  });
}

export function useUpdateProjectCustomField(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "custom-fields", "update"],
    mutationFn: ({
      fieldId,
      ...data
    }: {
      fieldId: number;
      name?: string;
      type?: CustomFieldType;
      options?: string[] | null;
      required?: boolean;
    }) =>
      apiClient.patch<ProjectCustomField>(
        `/build/${projectId}/custom-fields/${fieldId}`,
        data,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: customFieldKeys(projectId) }),
  });
}

export function useDeleteProjectCustomField(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "custom-fields", "delete"],
    mutationFn: (fieldId: number) =>
      apiClient.delete(`/build/${projectId}/custom-fields/${fieldId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: customFieldKeys(projectId) }),
  });
}

export function useTicketCustomFieldValues(projectId: number, ticketId: number) {
  return useQuery<TicketCustomFieldValue[]>({
    queryKey: ticketCustomFieldValueKeys(projectId, ticketId),
    queryFn: () =>
      apiClient.get<TicketCustomFieldValue[]>(
        `/build/${projectId}/tickets/${ticketId}/custom-field-values`,
      ),
    enabled: !!projectId && !!ticketId,
    staleTime: 30_000,
  });
}

export function useUpsertTicketCustomFieldValues(
  projectId: number,
  ticketId: number,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: [
      "projects",
      projectId,
      "tickets",
      ticketId,
      "custom-field-values",
      "upsert",
    ],
    mutationFn: (values: Array<{ fieldId: number; value: string | null }>) =>
      apiClient.post(
        `/build/${projectId}/tickets/${ticketId}/custom-field-values`,
        { values },
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ticketCustomFieldValueKeys(projectId, ticketId),
      }),
  });
}
