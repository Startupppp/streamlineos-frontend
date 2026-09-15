"use client";

import type { z } from "zod";

import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const projectCustomStateListContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.projectCustomStateListContract),
);
const projectCustomStateContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.projectCustomStateContract),
);
const bulkReorderStatesResultContract = lazyContract(() =>
  import("@/hooks/api/build/build-project-schema").then((m) => m.bulkReorderStatesResultContract),
);

import type { projectCustomStateContract as projectCustomStateContractDef } from "@/hooks/api/build/build-project-schema";

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
export type CustomState = z.infer<typeof projectCustomStateContractDef>;

type StateUpdateInput = {
  stateId: number;
  name?: string;
  color?: string;
  order?: number;
  type?: "unstarted" | "started" | "completed" | "cancelled";
};

type UpdateContext = {
  previous: CustomState[] | undefined;
};

type ReorderItem = { stateId: number; order: number };
type ReorderPayloadItem = { stateId: number; order: number; expectedOrder?: number };
type BulkReorderResult = { items: { id: number; order: number }[] };
type ReorderContext = { previousStates: CustomState[] | undefined };

const MAX_BULK_REORDER = 50;

function invalidateStateCaches(
  qc: ReturnType<typeof useQueryClient>,
  projectId: number,
) {
  void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.customStates(projectId) });
  void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.detail(projectId) });
}

export function useCustomStates(projectId: number) {
  const canView = useCan("build:view");
  return useQuery<CustomState[]>({
    queryKey: buildWorkQueryKeys.projects.customStates(projectId),
    queryFn: ({ signal }) =>
      apiClient.get<CustomState[]>(`/build/${projectId}/custom-states`, undefined, signal, projectCustomStateListContract),
    enabled: canView && !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateCustomState(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "custom-states", "create"],
    mutationFn: (data: {
      name: string;
      color: string;
      type?: "unstarted" | "started" | "completed" | "cancelled";
    }) =>
      apiClient.post<CustomState>(`/build/${projectId}/custom-states`, data, undefined, projectCustomStateContract),
    onSuccess: () => {
      invalidateStateCaches(qc, projectId);
    },
  });
}

export function useUpdateCustomState(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "custom-states", "update"],
    mutationFn: ({ stateId, ...data }: StateUpdateInput) =>
      apiClient.patch<CustomState>(
        `/build/${projectId}/custom-states/${stateId}`,
        data,
        undefined,
        projectCustomStateContract,
      ),
    onMutate: async (vars): Promise<UpdateContext> => {
      await qc.cancelQueries({ queryKey: buildWorkQueryKeys.projects.customStates(projectId) });
      const previous = qc.getQueryData<CustomState[]>(buildWorkQueryKeys.projects.customStates(projectId));
      qc.setQueryData<CustomState[]>(buildWorkQueryKeys.projects.customStates(projectId), (old) =>
        old?.map((s) => {
          if (s.id !== vars.stateId) return s;
          return {
            ...s,
            ...(vars.name !== undefined ? { name: vars.name } : {}),
            ...(vars.color !== undefined ? { color: vars.color } : {}),
            ...(vars.order !== undefined ? { order: vars.order } : {}),
            ...(vars.type !== undefined ? { type: vars.type } : {}),
          };
        }),
      );
      return { previous };
    },
    onError: (_, _vars, context) => {
      if (context?.previous)
        qc.setQueryData(buildWorkQueryKeys.projects.customStates(projectId), context.previous);
    },
    onSettled: () => {
      invalidateStateCaches(qc, projectId);
    },
  });
}

export function useReorderCustomStates(projectId: number) {
  const qc = useQueryClient();
  const snapshotRef = useRef<CustomState[] | undefined>(undefined);

  return useAuthorizedMutation<BulkReorderResult, Error, ReorderItem[], ReorderContext>("build:manage", {
    mutationKey: ["projects", projectId, "custom-states", "reorder"],
    mutationFn: (items) => {
      if (items.length > MAX_BULK_REORDER)
        throw new Error(`Cannot reorder more than ${MAX_BULK_REORDER} states at once (got ${items.length})`);
      const snapshot = snapshotRef.current;
      const payload: ReorderPayloadItem[] = items.map((item) => ({
        stateId: item.stateId,
        order: item.order,
        expectedOrder: snapshot?.find((s) => s.id === item.stateId)?.order,
      }));
      return apiClient.put<BulkReorderResult>(
        `/build/${projectId}/custom-states`,
        { items: payload },
        undefined,
        bulkReorderStatesResultContract,
      );
    },
    onMutate: async (items): Promise<ReorderContext> => {
      await qc.cancelQueries({ queryKey: buildWorkQueryKeys.projects.customStates(projectId) });
      const previousStates = qc.getQueryData<CustomState[]>(
        buildWorkQueryKeys.projects.customStates(projectId),
      );
      snapshotRef.current = previousStates;
      const orderMap = new Map(items.map((i) => [i.stateId, i.order]));
      qc.setQueryData<CustomState[]>(buildWorkQueryKeys.projects.customStates(projectId), (old) => {
        if (!old) return old;
        return [...old]
          .map((s) => ({ ...s, order: orderMap.get(s.id) ?? s.order }))
          .sort((a, b) => a.order - b.order);
      });
      return { previousStates };
    },
    onError: (_, __, context) => {
      if (context?.previousStates !== undefined)
        qc.setQueryData(buildWorkQueryKeys.projects.customStates(projectId), context.previousStates);
    },
    onSettled: () => invalidateStateCaches(qc, projectId),
  });
}

export function useDeleteCustomState(projectId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:manage", {
    mutationKey: ["projects", projectId, "custom-states", "delete"],
    mutationFn: (stateId: number) =>
      apiClient.delete<void>(`/build/${projectId}/custom-states/${stateId}`, undefined, undefined, noContentContract),
    onMutate: async (stateId): Promise<UpdateContext> => {
      await qc.cancelQueries({ queryKey: buildWorkQueryKeys.projects.customStates(projectId) });
      const previous = qc.getQueryData<CustomState[]>(buildWorkQueryKeys.projects.customStates(projectId));
      qc.setQueryData<CustomState[]>(buildWorkQueryKeys.projects.customStates(projectId), (old) =>
        old?.filter((s) => s.id !== stateId),
      );
      return { previous };
    },
    onError: (_, _stateId, context) => {
      if (context?.previous)
        qc.setQueryData(buildWorkQueryKeys.projects.customStates(projectId), context.previous);
    },
    onSettled: () => {
      invalidateStateCaches(qc, projectId);
    },
  });
}
