"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { apiClient, isImpersonating } from "@/lib/api-client";
import { ApiError, getApiErrorCode, lazyContract } from "@/lib/api-envelope";
import type { ExpectedRequestIdentity } from "@/lib/api-request-identity";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import {
  acknowledgeDraftIntent, draftEditInputSchema, peekDraftIntents, replayDraftIntents,
  serializeDraftSave, stageDraftIntent, type BufferedDraftIntent,
} from "./comment-draft-offline-buffer";
import { useCommentDraftOwner } from "./comment-drafts-read";
import {
  applyCommentDraftReceipt, beginCommentDraftDeletion, restoreCommentDraftDeletion,
  type CommentDraft,
} from "./comment-draft-command-cache";
import type { CommentDraftsListMineResponse } from "@/contracts/build-contracts.generated";

type DraftPages = InfiniteData<CommentDraftsListMineResponse>;

export interface StagedCommentDraft {
  scope: string;
  identity: ExpectedRequestIdentity;
  key: string;
  entry: BufferedDraftIntent;
}
interface DraftCommand extends StagedCommentDraft {
  signal: AbortSignal;
}
interface CommandContext {
  previous: DraftPages | undefined;
}
interface Recovery {
  ownerKey: string | null;
  ticketId: number | null;
  revision: string | null;
  error: unknown;
}

const commentDraftContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => m.commentDraftsUpsertResponseSchema),
);
const commentDraftDeletedContract = lazyContract(() =>
  import("@/contracts/build-contracts.generated").then((m) => m.commentDraftsDeleteOneResponseSchema),
);

function identityChanged() {
  return new ApiError(
    "Your signed-in account changed. Retry from the current account.",
    undefined, "REQUEST_IDENTITY_CHANGED",
  );
}
function superseded() {
  return new ApiError("A newer draft replaced this save.", undefined, "DRAFT_SUPERSEDED");
}
function latestIntent(command: StagedCommentDraft) {
  const entry = peekDraftIntents(command.scope).find(
    (item) => item.ticketId === command.entry.ticketId,
  );
  return entry?.revision === command.entry.revision && entry.kind === command.entry.kind && (
    entry.kind !== "upsert" || command.entry.kind !== "upsert" || entry.body === command.entry.body
  );
}

function useDraftCommands(autoReplay: boolean) {
  const qc = useQueryClient();
  const isOnline = useOnlineStatus();
  const owner = useCommentDraftOwner();
  const ownerKey = owner?.key ?? null;
  const current = useRef(owner);
  useLayoutEffect(() => {
    current.current = owner;
    return () => { current.current = null; };
  }, [owner]);
  const controllers = useRef(new Set<AbortController>());
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [receipt, setReceipt] = useState<{ ownerKey: string; revision: string } | null>(null);
  const isCurrent = useCallback((command: StagedCommentDraft, signal?: AbortSignal) => {
    const active = current.current;
    return !signal?.aborted && !isImpersonating() &&
      active?.key === command.key && active.scope === command.scope &&
      active.identity.userId === command.identity.userId &&
      active.identity.orgId === command.identity.orgId &&
      active.identity.sessionId === command.identity.sessionId;
  }, []);
  useEffect(() => {
    const pending = controllers.current;
    return () => {
      for (const controller of pending) controller.abort();
      pending.clear();
    };
  }, [ownerKey]);

  const mutation = useAuthorizedMutation<CommentDraft | null, Error, DraftCommand, CommandContext>("build:tickets:view", {
    meta: { buildCacheSync: false },
    mutationKey: ["projects", "comment-drafts", "command"],
    onMutate: async (command) => {
      if (command.entry.kind !== "delete") return { previous: undefined };
      const previous = await beginCommentDraftDeletion(
        qc, command.entry.ticketId,
        () => isCurrent(command, command.signal) && latestIntent(command),
      );
      return { previous };
    },
    mutationFn: async (command) => {
      if (!isCurrent(command, command.signal)) throw identityChanged();
      if (!latestIntent(command)) throw superseded();
      const config = { signal: command.signal, expectedIdentity: command.identity };
      if (command.entry.kind === "upsert") {
        const draft = await apiClient.put<CommentDraft>(
          `/build/comment-drafts/tickets/${command.entry.ticketId}`, { body: command.entry.body }, config, commentDraftContract,
        );
        if (draft.ticketId !== command.entry.ticketId || draft.body !== command.entry.body)
          throw new ApiError("The saved draft did not match the request.", undefined, "INVALID_RESPONSE");
        return draft;
      }
      const result = await apiClient.delete<{ deleted: boolean }>(
        `/build/comment-drafts/by-ticket/${command.entry.ticketId}`, undefined, config, commentDraftDeletedContract,
      );
      if (!result.deleted) throw new ApiError("The draft deletion was not confirmed.", undefined, "INVALID_RESPONSE");
      return null;
    },
    onError: (_error, command, context) => {
      if (isCurrent(command, command.signal) && latestIntent(command) && context?.previous)
        restoreCommentDraftDeletion(qc, command.entry.ticketId, context.previous);
    },
    onSuccess: (draft, command) => {
      if (!isCurrent(command, command.signal) || !latestIntent(command)) return;
      acknowledgeDraftIntent(command.scope, command.entry);
      setReceipt({ ownerKey: command.key, revision: command.entry.revision });
      setRecovery(null);
      applyCommentDraftReceipt(qc, command.entry.ticketId, draft);
    },
  });
  const { mutateAsync: authorizedCommand } = mutation;
  const dispatch = useCallback((command: DraftCommand) =>
    serializeDraftSave(command.scope, command.entry.ticketId, command.signal, () => {
      if (!isCurrent(command, command.signal)) throw identityChanged();
      return authorizedCommand(command);
    }), [authorizedCommand, isCurrent],
  );
  useEffect(() => {
    const active = current.current;
    if (!autoReplay || !isOnline || !active) return;
    const controller = new AbortController();
    controllers.current.add(controller);
    let attempted: BufferedDraftIntent | null = null;
    void replayDraftIntents(active.scope, async (entry) => {
      attempted = entry;
      const command = { ...active, entry, signal: controller.signal };
      await dispatch(command);
      return isCurrent(command, command.signal);
    }, controller.signal).catch((error: unknown) => {
      if (!controller.signal.aborted && getApiErrorCode(error) !== "DRAFT_SUPERSEDED")
        setRecovery({
          ownerKey, ticketId: attempted?.ticketId ?? null,
          revision: attempted?.revision ?? null, error,
        });
    }).finally(() => { controllers.current.delete(controller); });
    return () => controller.abort();
  }, [autoReplay, isOnline, ownerKey, dispatch, isCurrent]);

  const stageEdit = useCallback((args: { ticketId: number; body: string }): StagedCommentDraft => {
    const active = current.current;
    if (!active || isImpersonating()) throw identityChanged();
    const input = draftEditInputSchema.parse(args);
    const entry = stageDraftIntent(active.scope, input.ticketId, input.body);
    if (!entry) throw new ApiError(
      "The draft could not be stored on this device. Keep your text and retry.",
      undefined, "DRAFT_STORAGE_UNAVAILABLE",
    );
    setRecovery(null);
    return { ...active, entry };
  }, []);
  const flushStaged = useCallback(async (staged: StagedCommentDraft) => {
    if (!isCurrent(staged)) throw identityChanged();
    if (!latestIntent(staged)) throw superseded();
    if (!isOnline) return null;
    const controller = new AbortController();
    controllers.current.add(controller);
    try {
      return await dispatch({ ...staged, signal: controller.signal });
    } finally {
      controllers.current.delete(controller);
    }
  }, [isOnline, dispatch, isCurrent]);
  const mutateAsync = useCallback(async (args: { ticketId: number; body: string }) =>
    flushStaged(stageEdit(args)), [flushStaged, stageEdit],
  );
  const mutate = useCallback((args: { ticketId: number; body: string }) => {
    let staged: StagedCommentDraft;
    try { staged = stageEdit(args); }
    catch (error: unknown) {
      setRecovery({ ownerKey, ticketId: args.ticketId, revision: null, error });
      return;
    }
    void flushStaged(staged).catch((error: unknown) => {
      if (getApiErrorCode(error) !== "DRAFT_SUPERSEDED")
        setRecovery({
          ownerKey, ticketId: staged.entry.ticketId,
          revision: staged.entry.revision, error,
        });
    });
  }, [stageEdit, flushStaged, ownerKey]);
  const recoveryEntry = owner && recovery?.ticketId
    ? peekDraftIntents(owner.scope).find((entry) => entry.ticketId === recovery.ticketId)
    : undefined;
  const activeRecovery = recovery?.ownerKey === ownerKey && (
    !recovery.revision || recoveryEntry?.revision === recovery.revision
  ) ? recovery : null;
  const error = activeRecovery ? activeRecovery.error
    : mutation.variables && isCurrent(mutation.variables) && latestIntent(mutation.variables)
      ? mutation.error : null;
  const visibleError = getApiErrorCode(error) === "DRAFT_SUPERSEDED" ? null : error;
  return {
    ...mutation, stageEdit, flushStaged, mutate, mutateAsync, isOnline,
    receipt: receipt?.ownerKey === ownerKey ? receipt : null,
    errorTicketId: activeRecovery?.ticketId ?? mutation.variables?.entry.ticketId ?? null,
    error: visibleError, isError: visibleError !== null,
  };
}

export function useUpsertCommentDraft() {
  return useDraftCommands(true);
}

export function useDeleteCommentDraftByTicket() {
  const command = useDraftCommands(false);
  const { mutate: edit, mutateAsync: editAsync } = command;
  const mutate = useCallback((ticketId: number) =>
    edit({ ticketId, body: "" }), [edit],
  );
  const mutateAsync = useCallback(async (ticketId: number) => {
    await editAsync({ ticketId, body: "" });
    return { deleted: command.isOnline };
  }, [editAsync, command.isOnline]);
  return { ...command, mutate, mutateAsync, data: command.isSuccess ? { deleted: true } : undefined };
}
