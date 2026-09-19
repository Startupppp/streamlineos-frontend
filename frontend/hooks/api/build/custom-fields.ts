"use client";

import { lazyContract } from "@/lib/api-envelope";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys as queryKeys } from "@/lib/query-keys/build-work";
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
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const tfvListLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.ticketFieldValueListContract),
);
const tfvCreateLazy = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.ticketFieldValueCreateContract),
);

export function useProjectCustomFields(projectId: number) {
  const canView = useCan("build:view");
  return useQuery<ProjectCustomField[]>({
    queryKey: queryKeys.projects.customFields(projectId),
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
      qc.invalidateQueries({ queryKey: queryKeys.projects.customFields(projectId) }),
  });
}

export function useUpdateProjectCustomField(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "custom-fields", "update"],
    mutationFn: ({
      fieldId,
      data,
    }: {
      fieldId: number;
      data: {
        name?: string;
        type?: CustomFieldType;
        options?: string[] | null;
        required?: boolean;
        position?: number;
      };
    }) =>
      apiClient.patch<ProjectCustomField>(
        `/build/${projectId}/custom-fields/${fieldId}`,
        data,
        undefined,
        cfLazy,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.projects.customFields(projectId) }),
  });
}

export function useDeleteProjectCustomField(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "custom-fields", "delete"],
    mutationFn: (fieldId: number) =>
      apiClient.delete<void>(`/build/${projectId}/custom-fields/${fieldId}`, undefined, undefined, cfDeleteLazy),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.projects.customFields(projectId) }),
  });
}

export function useTicketCustomFieldValues(projectId: number, ticketId: number) {
  const canView = useCan("build:tickets:view");
  return useQuery<TicketCustomFieldValue[]>({
    queryKey: queryKeys.projects.ticketCustomFieldValues(projectId, ticketId),
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
        queryKey: queryKeys.projects.ticketCustomFieldValues(projectId, ticketId),
      }),
  });
}
