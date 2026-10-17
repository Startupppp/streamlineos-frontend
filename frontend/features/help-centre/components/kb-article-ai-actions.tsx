"use client";

import { useState } from "react";
import {
  Lightbulb,
  ListTree,
  MessageSquareText,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { AiActionsMenu, type AiAction, type AiActionResult } from "@/components/ai";
import { KbDocAskSheet } from "@/components/kb/kb-doc-ask-sheet";
import { streamKbDocAi, type KbDocAiAction } from "@/hooks/api/kb/doc-ai-stream";
import { useCan } from "@/hooks/api/access";

interface KbArticleAiActionsProps {
  articleId: number;
  onApplyImprovement?: (text: string) => void;
}

export function KbArticleAiActions({ articleId, onApplyImprovement }: KbArticleAiActionsProps) {
  const canGenerate = useCan("kb:ai:generate");
  const [askOpen, setAskOpen] = useState(false);

  function handleApplyImprovement(text: string) {
    onApplyImprovement?.(text);
    toast.success("Improvement draft ready — paste it into the editor");
  }

  async function runAsk(): Promise<AiActionResult> {
    setAskOpen(true);
    return { text: "" };
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
      label: "Summarize",
      description: "Key points as concise bullets",
      icon: ListTree,
      run: streamAction("summarize"),
    },
    {
      key: "ask",
      label: "Ask about this article",
      description: "Answers grounded in this article only",
      icon: MessageSquareText,
      run: runAsk,
    },
    {
      key: "improve",
      label: "Improve writing",
      description: "Rewritten draft you review and apply",
      icon: PenLine,
      run: streamAction("improve"),
      onApply: onApplyImprovement ? handleApplyImprovement : undefined,
      applyLabel: "Apply draft",
    },
    {
      key: "suggest-related",
      label: "Suggest related topics",
      description: "Ideas that extend this article",
      icon: Lightbulb,
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
