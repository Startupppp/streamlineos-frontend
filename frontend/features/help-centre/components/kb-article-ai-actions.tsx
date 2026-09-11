"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AiActionsMenu, type AiAction, type AiActionResult } from "@/components/ai";
import { KbDocAskSheet } from "@/components/kb/kb-doc-ask-sheet";
import { streamKbDocAi, type KbDocAiAction } from "@/hooks/api/kb/doc-ai-stream";
import { useCan } from "@/hooks/api/access";

interface KbArticleAiActionsProps {
  articleId: number;
  onApplyImprovement?: (text: string) => void;
}

/**
 * The three generating actions stream. `AiActionsMenu` already renders a
 * streaming state, a Stop that keeps the partial answer and an unmount abort —
 * it was being handed a buffered `run` that never called `onToken`, so the user
 * watched a skeleton for the whole generation. `improve` declares a 1024-token
 * ceiling, which a buffered call could not reliably deliver inside the client's
 * own cap on non-streaming requests.
 */
export function KbArticleAiActions({ articleId, onApplyImprovement }: KbArticleAiActionsProps) {
  const canGenerate = useCan("kb:ai:generate");
  const [askOpen, setAskOpen] = useState(false);

  function handleApplyImprovement(text: string) {
    onApplyImprovement?.(text);
    toast.success("Improvement draft ready — paste it into the editor");
  }

  function streamAction(action: KbDocAiAction) {
    return async (signal?: AbortSignal, onToken?: (chunk: string) => void): Promise<AiActionResult> => {
      const outcome = await streamKbDocAi({
        scope: "articles",
        docId: articleId,
        action,
        ...(onToken !== undefined ? { onToken } : {}),
        ...(signal !== undefined ? { signal } : {}),
      });
      return { text: outcome.text };
    };
  }

  const actions: AiAction[] = [
    {
      key: "summarize",
      label: "Summarize this article",
      description: "Concise bullet-point summary",
      run: streamAction("summarize"),
    },
    {
      key: "ask",
      label: "Ask about this article",
      description: "Question scoped to this article only",
      run: async (): Promise<AiActionResult> => {
        setAskOpen(true);
        return { text: "" };
      },
    },
    {
      key: "improve",
      label: "Improve writing",
      description: "Get a rewritten draft — you apply it",
      run: streamAction("improve"),
      onApply: onApplyImprovement ? handleApplyImprovement : undefined,
      applyLabel: "Apply draft",
    },
    {
      key: "suggest-related",
      label: "Suggest related topics",
      description: "Topics that complement this article",
      run: streamAction("suggest-related"),
    },
  ];

  if (!canGenerate) return null;

  return (
    <>
      <AiActionsMenu actions={actions} triggerLabel="AI" menuLabel="AI assist" align="end" />
      <KbDocAskSheet
        scope="articles"
        docId={articleId}
        open={askOpen}
        onOpenChange={setAskOpen}
        title="Ask about this article"
        description="Ask a question — the answer is grounded in this article only."
      />
    </>
  );
}
