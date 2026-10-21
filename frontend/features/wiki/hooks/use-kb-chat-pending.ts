"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import { useKbAsk } from "@/hooks/api/kb/ask";
import { isAiStreamAbort } from "@/hooks/api/ai-text-stream";
import { isApiError } from "@/lib/api-envelope";
import type { KbChatHistoryMessage, KbChatHistoryPage } from "@/hooks/api/kb/chat-history";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { getErrorMessage } from "@/lib/get-error-message";
import type { KbAskScopedInput } from "@/hooks/api/kb/ask";
import type { KbAskCitation } from "@/types/kb";

export interface Pending {
  question: string;
  spaceId?: number;
  answer?: string;
  error?: string;
  citations?: KbAskCitation[];
  hasContext?: boolean;
  disagreement?: { summary: string };
  isQuotaError?: boolean;
  quotaMessage?: string;
}

type ScopePayload = Pick<
  KbAskScopedInput,
  "sourceIds" | "pageIds" | "verifiedOnly" | "spaceId" | "ownerMembershipId" | "status"
>;

interface UseKbChatPendingParams {
  activeConversationId: number | null;
  setConversation: (id: number | null) => void;
  scopePayload: ScopePayload;
  scopeSpaceId: number | null;
  markNearBottom: () => void;
}

export function useKbChatPending({
  activeConversationId,
  setConversation,
  scopePayload,
  scopeSpaceId,
  markNearBottom,
}: UseKbChatPendingParams) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<Pending | null>(null);
  const tempIdRef = useRef(0);
  const generationRef = useRef(0);
  const sendingRef = useRef(false);

  const ask = useKbAsk();

  function sendMessage(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed || ask.isPending || sendingRef.current) return false;
    sendingRef.current = true;
    markNearBottom();
    setPending({
      question: trimmed,
      ...(scopeSpaceId !== null ? { spaceId: scopeSpaceId } : {}),
    });
    const generation = ++generationRef.current;
    function handleToken(token: string) {
      if (generationRef.current === generation)
        setPending((current) =>
          current ? { ...current, answer: (current.answer ?? "") + token } : current,
        );
    }
    ask.mutate(
      {
        question: trimmed,
        conversationId: activeConversationId ?? undefined,
        onToken: handleToken,
        ...scopePayload,
      },
      {
        onSuccess: (data) => {
          sendingRef.current = false;
          if (generationRef.current !== generation) return;
          const convId = activeConversationId ?? data.conversationId;
          const now = new Date().toISOString();
          const userMsg: KbChatHistoryMessage = {
            id: (tempIdRef.current -= 1),
            role: "user",
            content: trimmed,
            citations: null,
            createdAt: now,
          };
          const assistantMsg: KbChatHistoryMessage = {
            id: (tempIdRef.current -= 1),
            role: "assistant",
            content: data.answer,
            citations: data.citations ?? null,
            createdAt: now,
          };
          qc.setQueryData<InfiniteData<KbChatHistoryPage>>(
            knowledgeAndSurveysQueryKeys.kb.chatConversationMessages(convId),
            (old) => {
              if (!old || old.pages.length === 0) {
                return {
                  pages: [{ messages: [assistantMsg, userMsg], nextCursor: null }],
                  pageParams: [undefined],
                };
              }
              return {
                ...old,
                pages: old.pages.map((page, i) =>
                  i === 0
                    ? { ...page, messages: [assistantMsg, userMsg, ...page.messages] }
                    : page,
                ),
              };
            },
          );
          if (activeConversationId === null) setConversation(data.conversationId);
          void qc.invalidateQueries({
            queryKey: knowledgeAndSurveysQueryKeys.kb.chatConversations(),
          });
          if (!data.hasContext) {
            setPending((prev) =>
              prev
                ? { ...prev, answer: undefined, hasContext: false, citations: data.citations }
                : prev,
            );
          } else if (data.disagreement) {
            setPending((prev) =>
              prev
                ? {
                    ...prev,
                    answer: undefined,
                    hasContext: true,
                    disagreement: data.disagreement,
                    citations: data.citations,
                  }
                : prev,
            );
          } else {
            setPending(null);
          }
        },
        onError: (error) => {
          sendingRef.current = false;
          if (generationRef.current !== generation) return;
          if (isAiStreamAbort(error)) {
            setPending((current) =>
              current
                ? { ...current, error: "Generation stopped. This answer is incomplete." }
                : current,
            );
            return;
          }
          if (isApiError(error) && error.status === 402) {
            setPending((current) =>
              current ? { ...current, isQuotaError: true, quotaMessage: error.message } : current,
            );
            return;
          }
          const message = getErrorMessage(error);
          setPending((prev) => (prev ? { ...prev, error: message } : prev));
          toast.error("Couldn't get an answer", { description: message });
        },
      },
    );
    return true;
  }

  function handleStop() {
    ask.stop();
  }

  function handleRegenerate() {
    if (!pending || ask.isPending) return;
    generationRef.current += 1;
    ask.resetAttempt();
    setPending(null);
    sendMessage(pending.question);
  }

  function handleDismissPending() {
    setPending(null);
  }

  function cancelGeneration() {
    generationRef.current += 1;
    ask.stop();
    setPending(null);
  }

  return {
    pending,
    setPending,
    ask,
    sendMessage,
    handleStop,
    handleRegenerate,
    handleDismissPending,
    cancelGeneration,
  };
}
