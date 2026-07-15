"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface CustomState {
  id: number;
  orgId: string;
  projectId: number;
  name: string;
  color: string | null;
  order: number;
  type?: "unstarted" | "started" | "completed" | "cancelled";
  wipLimit?: number | null;
}

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

function stateKeys(projectId: number) {
  return ["projects", projectId, "custom-states"] as const;
}

function invalidateStateCaches(
  qc: ReturnType<typeof useQueryClient>,
  projectId: number,
) {
  void qc.invalidateQueries({ queryKey: stateKeys(projectId) });
  void qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
}

export function useCustomStates(projectId: number) {
  return useQuery<CustomState[]>({
    queryKey: stateKeys(projectId),
    queryFn: () =>
      apiClient.get<CustomState[]>(`/projects/${projectId}/custom-states`),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateCustomState(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "custom-states", "create"],
    mutationFn: (data: {
      name: string;
      color: string;
      type?: "unstarted" | "started" | "completed" | "cancelled";
    }) =>
      apiClient.post<CustomState>(`/projects/${projectId}/custom-states`, data),
    onSuccess: () => {
      invalidateStateCaches(qc, projectId);
    },
  });
}

export function useUpdateCustomState(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "custom-states", "update"],
    mutationFn: ({ stateId, ...data }: StateUpdateInput) =>
      apiClient.patch<CustomState>(
        `/projects/${projectId}/custom-states/${stateId}`,
        data,
      ),
    onMutate: async (vars): Promise<UpdateContext> => {
      await qc.cancelQueries({ queryKey: stateKeys(projectId) });
      const previous = qc.getQueryData<CustomState[]>(stateKeys(projectId));
      qc.setQueryData<CustomState[]>(stateKeys(projectId), (old) =>
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
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(stateKeys(projectId), context.previous);
      }
    },
    onSettled: () => {
      invalidateStateCaches(qc, projectId);
    },
  });
}

export function useReorderCustomStates(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "custom-states", "reorder"],
    mutationFn: async (items: { stateId: number; order: number }[]) => {
      await Promise.all(
        items.map(({ stateId, order }) =>
          apiClient.patch<CustomState>(
            `/projects/${projectId}/custom-states/${stateId}`,
            { order },
          ),
        ),
      );
    },
    onSuccess: () => {
      invalidateStateCaches(qc, projectId);
    },
  });
}

export function useDeleteCustomState(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", projectId, "custom-states", "delete"],
    mutationFn: (stateId: number) =>
      apiClient.delete(`/projects/${projectId}/custom-states/${stateId}`),
    onMutate: async (stateId): Promise<UpdateContext> => {
      await qc.cancelQueries({ queryKey: stateKeys(projectId) });
      const previous = qc.getQueryData<CustomState[]>(stateKeys(projectId));
      qc.setQueryData<CustomState[]>(stateKeys(projectId), (old) =>
        old?.filter((s) => s.id !== stateId),
      );
      return { previous };
    },
    onError: (_err, _stateId, context) => {
      if (context?.previous) {
        qc.setQueryData(stateKeys(projectId), context.previous);
      }
    },
    onSettled: () => {
      invalidateStateCaches(qc, projectId);
    },
  });
}
