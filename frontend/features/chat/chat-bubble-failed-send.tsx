"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrgStorageScope } from "@/lib/org-scoped-storage";
import type { Message } from "@/types/chat";
import { chatDraftKey, isOutboxEntryFailed, subscribeOutbox } from "./composer-draft";
import { discardFailedSend, retryFailedSend } from "./chat-outbox-delivery";

function assumeNotFailed(): boolean {
  return false;
}

export function useFailedSend(message: Message): boolean {
  const scope = useOrgStorageScope();
  const draftKey = chatDraftKey(message.channelId, scope);
  const clientKey = message.id < 0 ? message.clientKey : null;
  const readFailed = useCallback(
    () => (clientKey ? isOutboxEntryFailed(draftKey, clientKey) : false),
    [draftKey, clientKey],
  );
  return useSyncExternalStore(subscribeOutbox, readFailed, assumeNotFailed);
}

interface ChatBubbleFailedSendProps {
  channelId: number;
  clientKey: string;
}

export function ChatBubbleFailedSend({ channelId, clientKey }: ChatBubbleFailedSendProps) {
  const queryClient = useQueryClient();
  const scope = useOrgStorageScope();
  const draftKey = chatDraftKey(channelId, scope);
  const handleRetry = useCallback(() => retryFailedSend(draftKey, clientKey), [draftKey, clientKey]);
  const handleDiscard = useCallback(
    () => discardFailedSend(queryClient, channelId, draftKey, clientKey),
    [queryClient, channelId, draftKey, clientKey],
  );
  return (
    <div role="status" className="mt-1 flex items-center gap-2 px-1 text-dense">
      <span className="flex items-center gap-1 font-medium text-destructive">
        <AlertCircle className="h-3 w-3" />
        Not sent
      </span>
      <Button type="button" variant="link" className="h-auto p-0 text-dense" onClick={handleRetry}>
        Retry
      </Button>
      <Button
        type="button"
        variant="link"
        className="h-auto p-0 text-dense text-muted-foreground"
        onClick={handleDiscard}
      >
        Discard
      </Button>
    </div>
  );
}
