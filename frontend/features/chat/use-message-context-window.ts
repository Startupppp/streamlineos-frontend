"use client";

import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useChatMessageContext } from "@/hooks/api/chat-message-windows";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Message } from "@/types/chat";
import { readChannelJoinRequired } from "./chat-helpers";

const MESSAGE_UNAVAILABLE_COPY = "That message is no longer available";

interface MessageContextWindowOptions {
  channelId: number;
  anchorMessageId: number | null;
  mainMessages: Message[];
  canReadChannel: boolean;
  historyLoading: boolean;
  dropAnchor: () => void;
}

export function useMessageContextWindow({
  channelId,
  anchorMessageId,
  mainMessages,
  canReadChannel,
  historyLoading,
  dropAnchor,
}: MessageContextWindowOptions) {
  const anchorInMain =
    anchorMessageId !== null &&
    mainMessages.some((message) => message.id === anchorMessageId);
  const contextEnabled = anchorMessageId !== null && !anchorInMain;
  const context = useChatMessageContext(
    channelId,
    anchorMessageId ?? 0,
    contextEnabled && canReadChannel,
  );
  const showContext = contextEnabled && !historyLoading;
  const contextMessages = useMemo(
    () =>
      showContext && context.data
        ? [...context.data.pages]
            .reverse()
            .flatMap((page) => page.messages)
            .filter(
              (message) => !message.isDeleted || message.id === anchorMessageId,
            )
        : null,
    [showContext, context.data, anchorMessageId],
  );

  const { error: contextError, refetch: refetchContext } = context;
  useEffect(() => {
    if (
      !contextEnabled ||
      !contextError ||
      readChannelJoinRequired(contextError)
    )
      return;
    const toastId = `chat-message-context-${channelId}-${anchorMessageId}`;
    if (
      isApiError(contextError) &&
      (contextError.status === 403 || contextError.status === 404)
    ) {
      toast.error(MESSAGE_UNAVAILABLE_COPY, { id: toastId });
      dropAnchor();
      return;
    }
    function retryContext() {
      void refetchContext();
    }
    toast.error(getErrorMessage(contextError), {
      id: toastId,
      action: { label: "Try again", onClick: retryContext },
    });
    return () => {
      toast.dismiss(toastId);
    };
  }, [
    contextEnabled,
    contextError,
    refetchContext,
    dropAnchor,
    channelId,
    anchorMessageId,
  ]);

  return { context, contextEnabled, contextMessages };
}
