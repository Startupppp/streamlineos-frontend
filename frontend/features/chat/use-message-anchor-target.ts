"use client";

import { useCallback, useMemo, useState } from "react";
import type { Message } from "./chat-types";

interface ThreadChoice {
  channelId: number;
  anchorMessageId: number | null;
  messageId: number | null;
}

interface MessageAnchorTargetOptions {
  channelId: number;
  anchorMessageId: number | null;
  messages: Message[];
}

export function useMessageAnchorTarget({
  channelId,
  anchorMessageId,
  messages,
}: MessageAnchorTargetOptions) {
  const [choice, setChoice] = useState<ThreadChoice | null>(null);

  const anchorIndex = useMemo(
    () =>
      anchorMessageId === null
        ? -1
        : messages.findIndex((message) => message.id === anchorMessageId),
    [messages, anchorMessageId],
  );
  const anchorParentId =
    anchorIndex >= 0 ? (messages[anchorIndex]?.replyToId ?? null) : null;

  const ownChoice = choice?.channelId === channelId ? choice : null;
  const threadMessageId =
    ownChoice &&
    (ownChoice.anchorMessageId === anchorMessageId || anchorParentId === null)
      ? ownChoice.messageId
      : anchorParentId;

  const openThread = useCallback(
    (messageId: number) => setChoice({ channelId, anchorMessageId, messageId }),
    [channelId, anchorMessageId],
  );
  const closeThread = useCallback(
    () => setChoice({ channelId, anchorMessageId, messageId: null }),
    [channelId, anchorMessageId],
  );

  const highlightedReplyId =
    anchorParentId !== null && threadMessageId === anchorParentId
      ? anchorMessageId
      : null;

  return { anchorIndex, threadMessageId, highlightedReplyId, openThread, closeThread };
}
