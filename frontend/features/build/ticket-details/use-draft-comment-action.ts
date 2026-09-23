"use client";

import { useCallback } from "react";
import { useGenerateCommentDraft } from "@/hooks/api/build/comment-drafts";
import type { AiAction, AiActionResult } from "@/components/ai/ai-actions-menu";

export function useDraftCommentAction(
  ticketId: number,
  onApply: (text: string) => void,
): AiAction {
  const generateDraft = useGenerateCommentDraft();
  const run = useCallback(
    async (signal?: AbortSignal): Promise<AiActionResult> => {
      const draft = await generateDraft.mutateAsync({ ticketId, signal });
      return { text: draft.body, aiUsage: draft.aiUsage };
    },
    [generateDraft, ticketId],
  );
  return {
    key: "draft-comment",
    label: "Draft comment",
    run,
    onApply,
    applyLabel: "Use draft",
  };
}
