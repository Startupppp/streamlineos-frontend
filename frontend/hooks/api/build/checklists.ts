"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import type { Checklist, ChecklistItem } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";


const checklistListLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then((m) => m.checklistListContract),
);
const checklistRowLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then((m) => m.checklistRowContract),
);
const checklistItemLazy = lazyContract(() =>
  import("@/hooks/api/build/build-tickets-subresource-schema").then((m) => m.checklistItemContract),
);
const noContentLazy = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

function checklistKeys(projectId: number, ticketId: number) {
  return ["projects", projectId, "tickets", ticketId, "checklists"] as const;
}

type Snap = Checklist[] | undefined;
type CreateCtx = { tempId: number; previous: Snap };

function getChecklists(qc: ReturnType<typeof useQueryClient>, projectId: number, ticketId: number): Snap {
  return qc.getQueryData<Checklist[]>(checklistKeys(projectId, ticketId));
}

function patchChecklists(
  qc: ReturnType<typeof useQueryClient>,
  projectId: number,
  ticketId: number,
  updater: (old: Checklist[]) => Checklist[],
) {
  qc.setQueryData<Checklist[]>(checklistKeys(projectId, ticketId), (old) =>
    old ? updater(old) : old,
  );
}

export function useChecklists(projectId: number, ticketId: number) {
  const canView = useCan("build:tickets:view");
  return useQuery<Checklist[]>({
    queryKey: checklistKeys(projectId, ticketId),
    queryFn: ({ signal }) =>
      apiClient.get<Checklist[]>(
        `/build/${projectId}/tickets/${ticketId}/checklists`, undefined, signal, checklistListLazy,
      ),
    enabled: canView && !!projectId && !!ticketId,
    staleTime: 30_000,
  });
}

export function useCreateChecklist(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<Checklist, Error, string, CreateCtx>("build:tickets:update", {
    mutationKey: ["projects", projectId, "tickets", ticketId, "checklists", "create"],
    mutationFn: (title: string) =>
      apiClient.post<Checklist>(
        `/build/${projectId}/tickets/${ticketId}/checklists`,
        { title },
        undefined,
        checklistRowLazy,
      ),
    onMutate: async (title) => {
      const key = checklistKeys(projectId, ticketId);
      await qc.cancelQueries({ queryKey: key });
      const previous = getChecklists(qc, projectId, ticketId);
      const tempId = -Date.now();
      const temp: Checklist = { id: tempId, ticketId, orgId: "", title, items: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      qc.setQueryData<Checklist[]>(key, (old) => (old ? [...old, temp] : [temp]));
      return { tempId, previous };
    },
    onSuccess: (data, _vars, ctx) => {
      if (ctx) patchChecklists(qc, projectId, ticketId, (old) => old.map((c) => (c.id === ctx.tempId ? data : c)));
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(checklistKeys(projectId, ticketId), ctx.previous);
    },
  });
}

export function useUpdateChecklist(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<Checklist, Error, { checklistId: number; title: string }, Snap>("build:tickets:update", {
    mutationKey: ["projects", projectId, "tickets", ticketId, "checklists", "update"],
    mutationFn: ({ checklistId, title }) =>
      apiClient.patch<Checklist>(
        `/build/${projectId}/tickets/${ticketId}/checklists/${checklistId}`,
        { title },
        undefined,
        checklistRowLazy,
      ),
    onMutate: async ({ checklistId, title }) => {
      const key = checklistKeys(projectId, ticketId);
      await qc.cancelQueries({ queryKey: key });
      const previous = getChecklists(qc, projectId, ticketId);
      patchChecklists(qc, projectId, ticketId, (old) =>
        old.map((c) => (c.id === checklistId ? { ...c, title } : c)),
      );
      return previous;
    },
    onSuccess: (data) => {
      patchChecklists(qc, projectId, ticketId, (old) =>
        old.map((c) => (c.id === data.id ? { ...data, items: c.items } : c)),
      );
    },
    onError: (_err, _vars, ctx) => {
      if (ctx !== undefined) qc.setQueryData(checklistKeys(projectId, ticketId), ctx);
    },
  });
}

export function useDeleteChecklist(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, number, Snap>("build:tickets:update", {
    mutationKey: ["projects", projectId, "tickets", ticketId, "checklists", "delete"],
    mutationFn: (checklistId: number) =>
      apiClient.delete<void>(
        `/build/${projectId}/tickets/${ticketId}/checklists/${checklistId}`,
        undefined,
        undefined,
        noContentLazy,
      ),
    onMutate: async (checklistId) => {
      const key = checklistKeys(projectId, ticketId);
      await qc.cancelQueries({ queryKey: key });
      const previous = getChecklists(qc, projectId, ticketId);
      patchChecklists(qc, projectId, ticketId, (old) => old.filter((c) => c.id !== checklistId));
      return previous;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx !== undefined) qc.setQueryData(checklistKeys(projectId, ticketId), ctx);
    },
  });
}

export function useCreateChecklistItem(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<ChecklistItem, Error, { checklistId: number; text: string; order?: number }, CreateCtx>("build:tickets:update", {
    mutationKey: ["projects", projectId, "tickets", ticketId, "checklist-items", "create"],
    mutationFn: ({ checklistId, text, order = 0 }) =>
      apiClient.post<ChecklistItem>(
        `/build/${projectId}/tickets/${ticketId}/checklists/${checklistId}/items`,
        { text, order },
        undefined,
        checklistItemLazy,
      ),
    onMutate: async ({ checklistId, text, order = 0 }) => {
      const key = checklistKeys(projectId, ticketId);
      await qc.cancelQueries({ queryKey: key });
      const previous = getChecklists(qc, projectId, ticketId);
      const tempId = -Date.now();
      const temp: ChecklistItem = { id: tempId, checklistId, text, isCompleted: false, assigneeId: null, dueDate: null, order, createdAt: new Date().toISOString() };
      patchChecklists(qc, projectId, ticketId, (old) =>
        old.map((c) => c.id === checklistId ? { ...c, items: [...(c.items ?? []), temp] } : c),
      );
      return { tempId, previous };
    },
    onSuccess: (data, { checklistId }, ctx) => {
      if (ctx) patchChecklists(qc, projectId, ticketId, (old) =>
        old.map((c) =>
          c.id === checklistId
            ? { ...c, items: (c.items ?? []).map((i) => (i.id === ctx.tempId ? data : i)) }
            : c,
        ),
      );
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) qc.setQueryData(checklistKeys(projectId, ticketId), ctx.previous);
    },
  });
}

export function useUpdateChecklistItem(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<ChecklistItem, Error, { checklistId: number; itemId: number; text?: string; isCompleted?: boolean; order?: number }, Snap>("build:tickets:update", {
    mutationKey: ["projects", projectId, "tickets", ticketId, "checklist-items", "update"],
    mutationFn: ({ checklistId, itemId, ...data }) =>
      apiClient.patch<ChecklistItem>(
        `/build/${projectId}/tickets/${ticketId}/checklists/${checklistId}/items/${itemId}`,
        data,
        undefined,
        checklistItemLazy,
      ),
    onMutate: async ({ checklistId, itemId, ...patch }) => {
      const key = checklistKeys(projectId, ticketId);
      await qc.cancelQueries({ queryKey: key });
      const previous = getChecklists(qc, projectId, ticketId);
      patchChecklists(qc, projectId, ticketId, (old) =>
        old.map((c) =>
          c.id === checklistId
            ? { ...c, items: (c.items ?? []).map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
            : c,
        ),
      );
      return previous;
    },
    onSuccess: (data, { checklistId }) => {
      patchChecklists(qc, projectId, ticketId, (old) =>
        old.map((c) =>
          c.id === checklistId
            ? { ...c, items: (c.items ?? []).map((i) => (i.id === data.id ? data : i)) }
            : c,
        ),
      );
    },
    onError: (_err, _vars, ctx) => {
      if (ctx !== undefined) qc.setQueryData(checklistKeys(projectId, ticketId), ctx);
    },
  });
}

export function useDeleteChecklistItem(projectId: number, ticketId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation<void, Error, { checklistId: number; itemId: number }, Snap>("build:tickets:update", {
    mutationKey: ["projects", projectId, "tickets", ticketId, "checklist-items", "delete"],
    mutationFn: ({ checklistId, itemId }) =>
      apiClient.delete<void>(
        `/build/${projectId}/tickets/${ticketId}/checklists/${checklistId}/items/${itemId}`,
        undefined,
        undefined,
        noContentLazy,
      ),
    onMutate: async ({ checklistId, itemId }) => {
      const key = checklistKeys(projectId, ticketId);
      await qc.cancelQueries({ queryKey: key });
      const previous = getChecklists(qc, projectId, ticketId);
      patchChecklists(qc, projectId, ticketId, (old) =>
        old.map((c) =>
          c.id === checklistId
            ? { ...c, items: (c.items ?? []).filter((i) => i.id !== itemId) }
            : c,
        ),
      );
      return previous;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx !== undefined) qc.setQueryData(checklistKeys(projectId, ticketId), ctx);
    },
  });
}
