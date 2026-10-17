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

function ticketValuesFilter(projectId: number) {
  return {
    queryKey: queryKeys.projects.customFields(projectId).slice(0, -1),
    predicate: (query: { queryKey: readonly unknown[] }) => query.queryKey.at(-1) === "custom-field-values",
  };
}

function sortFieldsByPosition(fields: ProjectCustomField[]): ProjectCustomField[] {
  return [...fields].sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER));
}

function applyFieldValues(
  current: TicketCustomFieldValue[],
  values: Array<{ fieldId: number; value: string | null }>,
  fields: ProjectCustomField[],
  ticketId: number,
): TicketCustomFieldValue[] {
  const now = new Date().toISOString();
  const next = current.map((entry) => {
    const change = values.find((value) => value.fieldId === entry.fieldId);
    return change ? { ...entry, value: change.value, updatedAt: now } : entry;
  });
  for (const change of values) {
    if (next.some((entry) => entry.fieldId === change.fieldId)) continue;
    const field = fields.find((candidate) => candidate.id === change.fieldId);
    if (!field) continue;
    next.push({ id: -change.fieldId, ticketId, fieldId: change.fieldId, field, value: change.value, createdAt: now, updatedAt: now });
  }
  return next;
}

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
    onSuccess: (created) =>
      qc.setQueryData<ProjectCustomField[]>(queryKeys.projects.customFields(projectId), (old) =>
        sortFieldsByPosition([...(old ?? []).filter((field) => field.id !== created.id), created]),
      ),
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
    onSuccess: (updated) => {
      qc.setQueryData<ProjectCustomField[]>(queryKeys.projects.customFields(projectId), (old) =>
        old ? sortFieldsByPosition(old.map((field) => (field.id === updated.id ? updated : field))) : old,
      );
      qc.setQueriesData<TicketCustomFieldValue[]>(
        ticketValuesFilter(projectId),
        (old) => old?.map((entry) => (entry.fieldId === updated.id ? { ...entry, field: updated } : entry)),
      );
    },
  });
}

export function useDeleteProjectCustomField(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "custom-fields", "delete"],
    mutationFn: (fieldId: number) =>
      apiClient.delete<void>(`/build/${projectId}/custom-fields/${fieldId}`, undefined, undefined, cfDeleteLazy),
    onSuccess: (_data, fieldId) => {
      qc.setQueryData<ProjectCustomField[]>(queryKeys.projects.customFields(projectId), (old) =>
        old?.filter((field) => field.id !== fieldId),
      );
      qc.setQueriesData<TicketCustomFieldValue[]>(
        ticketValuesFilter(projectId),
        (old) => old?.filter((entry) => entry.fieldId !== fieldId),
      );
    },
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
    onMutate: async (values) => {
      const valuesKey = queryKeys.projects.ticketCustomFieldValues(projectId, ticketId);
      await qc.cancelQueries({ queryKey: valuesKey, exact: true });
      const previous = qc.getQueryData<TicketCustomFieldValue[]>(valuesKey);
      const fields = qc.getQueryData<ProjectCustomField[]>(queryKeys.projects.customFields(projectId)) ?? [];
      qc.setQueryData<TicketCustomFieldValue[]>(valuesKey, (old) =>
        applyFieldValues(old ?? [], values, fields, ticketId),
      );
      return { valuesKey, previous };
    },
    onError: (_error, _values, context) => {
      if (context) qc.setQueryData(context.valuesKey, context.previous);
    },
  });
}
