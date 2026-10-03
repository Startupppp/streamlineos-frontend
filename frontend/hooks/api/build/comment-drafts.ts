"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, isImpersonating } from "@/lib/api-client";
import { ApiError, getApiErrorCode, lazyContract } from "@/lib/api-envelope";
import { expectedRequestIdentitySchema, type ExpectedRequestIdentity } from "@/lib/api-request-identity";
import { useOrgStorageScope } from "@/lib/org-scoped-storage";
import { authenticatedScope } from "@/lib/query-scope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { acknowledgeBufferedDraft, bufferDraft, commentDraftInputSchema, peekBuffer, replayBufferedDrafts, serializeDraftSave, type BufferedCommentDraft } from "./comment-draft-offline-buffer";
import type { GeneratedCommentDraft } from "./comment-drafts-schema";

export interface CommentDraftAssignee {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
}

export interface CommentDraftTicket {
  id: number;
  ticketNumber: number;
  title: string;
  status: string;
  priority: string | null;
  type: string;
  projectId: number | null;
  projectKey: string | null;
  projectName: string | null;
  assignee: CommentDraftAssignee | null;
}

export interface CommentDraft {
  id: number;
  ticketId: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  ticket?: CommentDraftTicket;
}

export interface CommentDraftListItem extends CommentDraft {
  ticket: CommentDraftTicket;
}


const commentDraftListContract = lazyContract(() =>
  import("@/hooks/api/build/comment-drafts-schema").then((m) => m.commentDraftListContract),
);
const commentDraftContract = lazyContract(() =>
  import("@/hooks/api/build/comment-drafts-schema").then((m) => m.commentDraftContract),
);
const commentDraftDeletedContract = lazyContract(() =>
  import("@/hooks/api/build/comment-drafts-schema").then((m) => m.commentDraftDeletedContract),
);
const generatedCommentDraftContract = lazyContract(() =>
  import("@/hooks/api/build/comment-drafts-schema").then((m) => m.generatedCommentDraftSchema),
);

export function useMyCommentDrafts() {
  const canView = useCan("build:tickets:view");
  return useQuery<CommentDraftListItem[]>({
    queryKey: buildWorkQueryKeys.projects.commentDrafts.mine(),
    queryFn: ({ signal }) => apiClient.get<CommentDraftListItem[]>("/build/comment-drafts/mine", undefined, signal, commentDraftListContract),
    enabled: canView,
    staleTime: 60_000,
  });
}

function subscribeImpersonation(change: () => void) {
  window.addEventListener("impersonation-change", change);
  return () => window.removeEventListener("impersonation-change", change);
}
interface DraftSave {
  ticketId: number;
  body: string;
  scope: string;
  identity: ExpectedRequestIdentity;
  signal: AbortSignal;
  buffered: BufferedCommentDraft | null;
}

export function useUpsertCommentDraft() {
  const qc = useQueryClient();
  const isOnline = useOnlineStatus();
  const { data: session, status } = useSession();
  const scope = useOrgStorageScope();
  const impersonating = useSyncExternalStore(subscribeImpersonation, isImpersonating, () => false);
  const identity = expectedRequestIdentitySchema.safeParse({ userId: session?.user?.id, orgId: session?.orgId, sessionId: session?.sessionId });
  const owner = status === "authenticated" && identity.success && !impersonating && scope === authenticatedScope(identity.data.orgId, identity.data.userId)
    ? { scope, identity: identity.data } : null;
  const ownerKey = owner ? `${owner.scope}:${owner.identity.sessionId}` : null;
  const current = useRef(owner);
  current.current = owner;
  const controllers = useRef(new Set<AbortController>());
  const [recovery, setRecovery] = useState<{ ownerKey: string | null; error: unknown } | null>(null);
  const isCurrent = useCallback((save: DraftSave) => {
    const active = current.current;
    return !save.signal.aborted && !isImpersonating() && active?.scope === save.scope && active.identity.sessionId === save.identity.sessionId;
  }, []);
  useEffect(() => {
    const pending = controllers.current;
    return () => { for (const controller of pending) controller.abort(); pending.clear(); };
  }, [ownerKey]);
  const mutation = useAuthorizedMutation("build:tickets:view", {
    meta: { buildCacheSync: false },
    mutationKey: ["projects", "comment-drafts", "upsert"],
    mutationFn: (save: DraftSave) => {
      if (!isCurrent(save)) throw new ApiError("Your signed-in account changed. Retry from the current account.", undefined, "REQUEST_IDENTITY_CHANGED");
      if (save.buffered && peekBuffer(save.scope).find((entry) => entry.ticketId === save.ticketId)?.revision !== save.buffered.revision)
        throw new ApiError("A newer draft replaced this save.", undefined, "DRAFT_SUPERSEDED");
      return apiClient.put<CommentDraft>(`/build/comment-drafts/tickets/${save.ticketId}`, { body: save.body }, { signal: save.signal, expectedIdentity: save.identity }, commentDraftContract);
    },
    onSuccess: (draft, save) => {
      if (!isCurrent(save)) return;
      if (draft.ticketId !== save.ticketId || draft.body !== save.body) throw new ApiError("The saved draft did not match the request.", undefined, "INVALID_RESPONSE");
      const buffered = peekBuffer(save.scope).find((entry) => entry.ticketId === save.ticketId);
      if (save.buffered && buffered?.revision !== save.buffered.revision) return;
      if (save.buffered) acknowledgeBufferedDraft(save.scope, save.buffered);
      setRecovery(null);
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentPulseAll() });
      const listKey = buildWorkQueryKeys.projects.commentDrafts.mine();
      const current = qc.getQueryData<CommentDraftListItem[]>(listKey);
      const index = current?.findIndex((d) => d.ticketId === draft.ticketId) ?? -1;
      const cached = index === -1 ? undefined : current?.[index];
      const ticket = draft.ticket ?? cached?.ticket;

      if (!current || !ticket) {
        void qc.invalidateQueries({ queryKey: listKey });
        return;
      }

      const merged: CommentDraftListItem = { ...cached, ...draft, ticket };
      const next = [...current];
      if (index === -1) next.unshift(merged);
      else next[index] = merged;
      qc.setQueryData(listKey, next);
    },
  });

  const { mutateAsync: authorizedSaveAsync } = mutation;
  const saveAsync = useCallback((save: DraftSave) => serializeDraftSave(save.scope, save.ticketId, save.signal, () => {
    if (!isCurrent(save)) throw new ApiError("Your signed-in account changed. Retry from the current account.", undefined, "REQUEST_IDENTITY_CHANGED");
    return authorizedSaveAsync(save);
  }), [authorizedSaveAsync, isCurrent]);

  useEffect(() => {
    const active = current.current;
    if (!isOnline || !active) return;
    const controller = new AbortController();
    controllers.current.add(controller);
    void replayBufferedDrafts(active.scope, async (entry) => {
      const save = { ...entry, ...active, signal: controller.signal, buffered: entry };
      await saveAsync(save);
      return isCurrent(save);
    }, controller.signal).catch((error: unknown) => {
      if (!controller.signal.aborted && getApiErrorCode(error) !== "DRAFT_SUPERSEDED") setRecovery({ ownerKey, error });
    }).finally(() => { controllers.current.delete(controller); });
    return () => controller.abort();
  }, [isOnline, ownerKey, saveAsync, isCurrent]);

  const mutateAsync = useCallback(async (args: { ticketId: number; body: string }) => {
    const active = current.current;
    if (!active || isImpersonating()) throw new ApiError("A signed-in organization session is required to save drafts.", undefined, "REQUEST_IDENTITY_CHANGED");
    const input = commentDraftInputSchema.parse(args);
    const buffered = bufferDraft(active.scope, input.ticketId, input.body);
    if (!isOnline) {
      if (!buffered) throw new ApiError("The draft could not be stored on this device. Keep your text and reconnect.", undefined, "DRAFT_STORAGE_UNAVAILABLE");
      return null;
    }
    const controller = new AbortController();
    controllers.current.add(controller);
    try { return await saveAsync({ ...input, ...active, buffered, signal: controller.signal }); }
    finally { controllers.current.delete(controller); }
  }, [isOnline, saveAsync]);
  const mutate = useCallback((args: { ticketId: number; body: string }) => {
    setRecovery(null);
    void mutateAsync(args).catch((error: unknown) => {
      if (getApiErrorCode(error) !== "DRAFT_SUPERSEDED") setRecovery({ ownerKey, error });
    });
  }, [mutateAsync, ownerKey]);

  const error = recovery?.ownerKey === ownerKey ? recovery.error : mutation.variables && isCurrent(mutation.variables) ? mutation.error : null;
  return { ...mutation, mutate, mutateAsync, error: getApiErrorCode(error) === "DRAFT_SUPERSEDED" ? null : error, isError: error !== null && getApiErrorCode(error) !== "DRAFT_SUPERSEDED" };
}

export function useDeleteCommentDraft() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:view", {
    meta: { buildCacheSync: false },
    mutationKey: ["projects", "comment-drafts", "delete"],
    mutationFn: (draftId: number) =>
      apiClient.delete<{ deleted: boolean }>(`/build/comment-drafts/${draftId}`, undefined, undefined, commentDraftDeletedContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.commentDrafts.mine() });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentPulseAll() });
    },
  });
}

export function useDeleteCommentDraftByTicket() {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ deleted: boolean }, Error, number, { previous: CommentDraftListItem[] | undefined }>(
    "build:tickets:view",
    {
      meta: { buildCacheSync: false },
      mutationKey: ["projects", "comment-drafts", "delete-by-ticket"],
      mutationFn: (ticketId: number) =>
        apiClient.delete<{ deleted: boolean }>(`/build/comment-drafts/tickets/${ticketId}`, undefined, undefined, commentDraftDeletedContract),
      onMutate: (ticketId: number) => {
        const listKey = buildWorkQueryKeys.projects.commentDrafts.mine();
        const previous = qc.getQueryData<CommentDraftListItem[]>(listKey);
        qc.setQueryData<CommentDraftListItem[]>(
          listKey,
          (current) => current?.filter((d) => d.ticketId !== ticketId) ?? [],
        );
        return { previous };
      },
      onError: (_err, _ticketId, context) => {
        if (context?.previous !== undefined) {
          qc.setQueryData(buildWorkQueryKeys.projects.commentDrafts.mine(), context.previous);
        }
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.commentDrafts.mine() });
        qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentPulseAll() });
      },
    },
  );
}

export function useDeleteAllCommentDrafts() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:tickets:view", {
    meta: { buildCacheSync: false },
    mutationKey: ["projects", "comment-drafts", "delete-all"],
    mutationFn: () =>
      apiClient.delete<{ deleted: boolean }>("/build/comment-drafts/mine", undefined, undefined, commentDraftDeletedContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.commentDrafts.mine() });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentPulseAll() });
    },
  });
}

export function useGenerateCommentDraft() {
  const qc = useQueryClient();
  return useAuthorizedMutation("build:ai:use", {
    mutationKey: ["projects", "comment-drafts", "generate"],
    mutationFn: ({ ticketId, signal }: { ticketId: number; signal?: AbortSignal }) =>
      apiClient.post<GeneratedCommentDraft>(
        `/build/comment-drafts/tickets/${ticketId}/generate-draft`,
        undefined,
        signal ? { signal } : undefined,
        generatedCommentDraftContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.commentDrafts.mine() });
      qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentPulseAll() });
    },
  });
}
