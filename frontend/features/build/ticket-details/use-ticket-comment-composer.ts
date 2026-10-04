"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTicketCommentDraft } from "@/hooks/api/build/comment-drafts-read";
import { useUpsertCommentDraft } from "@/hooks/api/build/comment-draft-commands";
import type { StagedCommentDraft } from "@/hooks/api/build/comment-draft-commands";
import { peekDraftIntents } from "@/hooks/api/build/comment-draft-offline-buffer";
import { getApiErrorCode } from "@/lib/api-envelope";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";

interface ComposerState {
  context: string | null;
  body: string;
  touched: boolean;
  hydrated: boolean;
  staged: StagedCommentDraft | null;
  volatile: boolean;
  error: unknown;
}

function restoreComposer(
  context: string | null,
  owner: ReturnType<typeof useTicketCommentDraft>["owner"],
  ticketId: number,
  draftBody?: string,
  restorePending = true,
): ComposerState {
  const pending =
    context && owner && restorePending
      ? peekDraftIntents(owner.scope).find(
          (entry) => entry.ticketId === ticketId,
        )
      : undefined;
  const pendingBody = pending
    ? pending.kind === "upsert"
      ? pending.body
      : ""
    : undefined;
  return {
    context,
    body: pendingBody ?? draftBody ?? "",
    touched: false,
    hydrated: pending !== undefined || draftBody !== undefined,
    staged: pending && owner ? { ...owner, entry: pending } : null,
    volatile: false,
    error: null,
  };
}

export function useTicketCommentComposer(ticketId: number, editable: boolean) {
  const saved = useTicketCommentDraft(ticketId, editable);
  const upsert = useUpsertCommentDraft();
  const { stageEdit } = upsert;
  const context = saved.owner ? `${saved.owner.key}:${ticketId}` : null;
  const currentContext = useRef(context);
  useLayoutEffect(() => {
    currentContext.current = context;
  }, [context]);
  const draftBody = saved.fresh ? (saved.data?.draft?.body ?? "") : undefined;
  const [state, setState] = useState(() =>
    restoreComposer(context, saved.owner, ticketId),
  );
  if (state.context !== context) {
    const changedSession =
      saved.owner &&
      state.context?.startsWith(`${saved.owner.scope}:`) &&
      !state.context.startsWith(`${saved.owner.key}:`);
    setState(
      restoreComposer(
        context,
        saved.owner,
        ticketId,
        undefined,
        !changedSession,
      ),
    );
  } else if (!state.touched && !state.hydrated && draftBody !== undefined)
    setState(
      restoreComposer(
        context,
        saved.owner,
        ticketId,
        draftBody,
      ),
    );
  const body = context !== null && state.context === context ? state.body : "";
  const flush = useRef(upsert.flushStaged);
  useLayoutEffect(() => {
    flush.current = upsert.flushStaged;
  }, [upsert.flushStaged]);
  useRegisterDirtyState(state.context === context && state.volatile);

  const persist = useCallback(
    async (staged: StagedCommentDraft) => {
      try {
        await flush.current(staged);
      } catch (error: unknown) {
        if (
          currentContext.current === context &&
          getApiErrorCode(error) !== "DRAFT_SUPERSEDED"
        )
          setState((value) =>
            value.staged?.entry.revision === staged.entry.revision
              ? { ...value, error }
              : value,
          );
      }
    },
    [context],
  );

  useEffect(() => {
    const staged = state.staged;
    if (
      !editable ||
      !context ||
      state.context !== context ||
      !state.touched ||
      !staged
    )
      return;
    const timer = setTimeout(() => {
      if (currentContext.current === context) void persist(staged);
    }, 1200);
    return () => clearTimeout(timer);
  }, [editable, context, state.context, state.touched, state.staged, persist]);

  const change = useCallback(
    (value: string) => {
      if (!context || currentContext.current !== context) return;
      try {
        const staged = stageEdit({ ticketId, body: value });
        setState({
          context,
          body: value,
          touched: true,
          hydrated: true,
          staged,
          volatile: false,
          error: null,
        });
      } catch (error: unknown) {
        setState({
          context,
          body: value,
          touched: true,
          hydrated: true,
          staged: null,
          volatile: true,
          error,
        });
      }
    },
    [context, ticketId, stageEdit],
  );
  const clear = useCallback(() => {
    if (context && currentContext.current === context)
      setState({
        context,
        body: "",
        touched: true,
        hydrated: true,
        staged: null,
        volatile: false,
        error: null,
      });
  }, [context]);
  const { refetch } = saved;
  const retry = useCallback(() => refetch(), [refetch]);
  const retryPersistence = useCallback(async () => {
    if (
      !context ||
      currentContext.current !== context ||
      state.context !== context
    )
      return;
    try {
      const staged = state.staged ?? stageEdit({ ticketId, body });
      setState((value) => ({ ...value, staged, volatile: false, error: null }));
      await persist(staged);
    } catch (error: unknown) {
      if (currentContext.current === context)
        setState((value) => ({ ...value, volatile: true, error }));
    }
  }, [
    context,
    state.context,
    state.staged,
    ticketId,
    body,
    stageEdit,
    persist,
  ]);
  const persistenceError =
    state.context === context && !(state.staged && upsert.receipt?.revision === state.staged.entry.revision)
      ? (state.error ?? (upsert.errorTicketId === ticketId ? upsert.error : null)) : null;
  const persistenceStatus =
    state.context === context && state.staged && !persistenceError
      ? upsert.receipt?.revision === state.staged.entry.revision
        ? "Saved"
        : upsert.isPending
          ? "Saving draft…"
          : upsert.isOnline
            ? "Saved on this device"
            : "Saved on this device · waiting to sync"
      : null;

  return {
    body,
    change,
    clear,
    retry,
    retryPersistence,
    persistenceError,
    persistenceStatus,
    ready: context !== null,
    loading:
      saved.isFetching &&
      (state.context !== context || (!state.touched && !state.hydrated)),
    loadError: saved.owner && saved.isError ? saved.error : null,
  };
}
