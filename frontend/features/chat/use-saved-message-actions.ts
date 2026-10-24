"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSavedMessages, useSaveMessage, useUnsaveMessage } from "@/hooks/api/chat-saved";

export function useSavedMessageActions() {
  const { data: savedData } = useSavedMessages();
  const saveMessage = useSaveMessage();
  const unsaveMessage = useUnsaveMessage();

  const savedMessageIds = useMemo(
    () => new Set(savedData?.pages.flatMap((p) => p.items.map((i) => i.messageId)) ?? []),
    [savedData],
  );

  const handleSave = useCallback(
    async (messageId: number) => {
      try {
        await saveMessage.mutateAsync(messageId);
        toast.success("Message saved");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [saveMessage],
  );

  const handleUnsaveMsg = useCallback(
    async (messageId: number) => {
      try {
        await unsaveMessage.mutateAsync(messageId);
        toast.success("Message removed from saved");
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [unsaveMessage],
  );

  return { savedMessageIds, handleSave, handleUnsaveMsg };
}
