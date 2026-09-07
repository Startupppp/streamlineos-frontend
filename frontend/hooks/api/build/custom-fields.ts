"use client";

import { lazyContract } from "@/lib/api-envelope";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import type {
  ProjectCustomField,
  TicketCustomFieldValue,
  CustomFieldType,
} from "@/types/projects/tasks";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const cfListLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.buildCustomFieldListContract),
);
const cfLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.buildCustomFieldContract),
);
const cfDeleteLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.successContract),
);
const tfvListLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.ticketFieldValueListContract),
);
const tfvCreateLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.ticketFieldValueCreateContract),
);

function customFieldKeys(projectId: number) {
  return ["projects", projectId, "custom-fields"] as const;
}

function ticketCustomFieldValueKeys(projectId: number, ticketId: number) {
  return ["projects", projectId, "tickets", ticketId, "custom-field-values"] as const;
}

export function useProjectCustomFields(projectId: number) {
  const canView = useCan("build:view");
  return useQuery<ProjectCustomField[]>({
    queryKey: customFieldKeys(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<ProjectCustomField[]>(`/build/${projectId}/custom-fields`, undefined, signal, cfListLazy),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateProjectCustomField(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
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
        undefined,
        cfLazy,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: customFieldKeys(projectId) }),
  });
}

export function useDeleteProjectCustomField(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "custom-fields", "delete"],
    mutationFn: (fieldId: number) =>
      apiClient.delete<{success:true}>(`/build/${projectId}/custom-fields/${fieldId}`, cfDeleteLazy),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: customFieldKeys(projectId) }),
  });
}

export function useTicketCustomFieldValues(projectId: number, ticketId: number) {
  const canView = useCan("build:tickets:view");
  return useQuery<TicketCustomFieldValue[]>({
    queryKey: ticketCustomFieldValueKeys(projectId, ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<TicketCustomFieldValue[]>(
        `/build/${projectId}/tickets/${ticketId}/custom-field-values`, undefined, signal, tfvListLazy,
      ),
    enabled: canView && !!projectId && !!ticketId,
    staleTime: 30_000,
  });
}

export function useUpsertTicketCustomFieldValues(
  projectId: number,
  ticketId: number,
) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:update", {
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
        undefined,
        tfvCreateLazy,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ticketCustomFieldValueKeys(projectId, ticketId),
      }),
  });
}
