"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTicketCommentDraft, useUpsertCommentDraft } from "@/hooks/api/build/comment-drafts";
import { peekBuffer } from "@/hooks/api/build/comment-draft-offline-buffer";

interface ComposerState {
  context: string | null;
  body: string;
  touched: boolean;
  hydrated: boolean;
}

function restoreComposer(context: string | null, scope: string | undefined, ticketId: number, draftBody?: string): ComposerState {
  const pendingBody = context && scope ? peekBuffer(scope).find((entry) => entry.ticketId === ticketId)?.body : undefined;
  return { context, body: pendingBody ?? draftBody ?? "", touched: false, hydrated: pendingBody !== undefined || draftBody !== undefined };
}

export function useTicketCommentComposer(ticketId: number, editable: boolean) {
  const saved = useTicketCommentDraft(ticketId, editable);
  const upsert = useUpsertCommentDraft();
  const context = saved.owner ? `${saved.owner.key}:${ticketId}` : null;
  const currentContext = useRef(context);
  useLayoutEffect(() => { currentContext.current = context; }, [context]);
  const scope = saved.owner?.scope;
  const draftBody = saved.fresh ? saved.data?.draft?.body ?? "" : undefined;
  const [state, setState] = useState(() => restoreComposer(context, scope, ticketId));
  if (state.context !== context) setState(restoreComposer(context, scope, ticketId));
  else if (!state.touched && !state.hydrated && draftBody !== undefined) setState(restoreComposer(context, scope, ticketId, draftBody));
  const body = context !== null && state.context === context ? state.body : "";
  const mutate = useRef(upsert.mutate);
  useLayoutEffect(() => { mutate.current = upsert.mutate; }, [upsert.mutate]);

  useEffect(() => {
    if (!editable || !context || state.context !== context || !state.touched || !body.trim()) return;
    const timer = setTimeout(() => {
      if (currentContext.current === context) mutate.current({ ticketId, body });
    }, 1200);
    return () => clearTimeout(timer);
  }, [editable, context, state.context, state.touched, body, ticketId]);

  const change = useCallback((value: string) => {
    if (context && currentContext.current === context) setState({ context, body: value, touched: true, hydrated: true });
  }, [context]);
  const clear = useCallback(() => {
    if (context && currentContext.current === context) setState({ context, body: "", touched: true, hydrated: true });
  }, [context]);
  const { refetch } = saved;
  const retry = useCallback(() => refetch(), [refetch]);

  return {
    body, change, clear, retry,
    ready: context !== null,
    loading: saved.isFetching && (state.context !== context || (!state.touched && !state.hydrated)),
    loadError: saved.owner && saved.isError ? saved.error : null,
  };
}
