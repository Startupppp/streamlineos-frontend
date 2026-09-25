"use client";

import { useState } from "react";
import { Lightbulb, ListTree, MessageSquareText, PenLine } from "lucide-react";
import {
  AiActionsMenu,
  type AiAction,
  type AiActionResult,
} from "@/components/ai";
import { KbDocAskSheet } from "@/components/kb/kb-doc-ask-sheet";
import {
  streamKbDocAi,
  type KbDocAiAction,
} from "@/hooks/api/kb/doc-ai-stream";
import { useCan } from "@/hooks/api/access";
import { KbPageImproveDiffDialog } from "./kb-page-improve-diff-dialog";

interface KbPageAiActionsProps {
  pageId: number;
  currentContent?: string;
  onApplyImprovement?: (text: string) => void;
  onInsertSummary?: (text: string) => void;
}

export function KbPageAiActions({
  pageId,
  currentContent,
  onApplyImprovement,
  onInsertSummary,
}: KbPageAiActionsProps) {
  const canGenerate = useCan("kb:ai:generate");
  const [askOpen, setAskOpen] = useState(false);
  const [improvePendingText, setImprovePendingText] = useState<string | null>(
    null,
  );

  function handleApplyImprovement(text: string) {
    setImprovePendingText(text);
  }

  function handleConfirmImprovement() {
    if (improvePendingText !== null) {
      onApplyImprovement?.(improvePendingText);
    }
    setImprovePendingText(null);
  }

  function handleDiscardImprovement() {
    setImprovePendingText(null);
  }

  async function runAsk(): Promise<AiActionResult> {
    setAskOpen(true);
    return { text: "" };
  }

  function streamAction(action: KbDocAiAction) {
    return async (
      signal?: AbortSignal,
      onToken?: (chunk: string) => void,
    ): Promise<AiActionResult> => {
      const outcome = await streamKbDocAi({
        scope: "pages",
        docId: pageId,
        action,
        ...(onToken !== undefined ? { onToken } : {}),
        ...(signal !== undefined ? { signal } : {}),
      });
      return {
        text: outcome.text,
        ...(outcome.status === "completed" && outcome.citations !== undefined
          ? { citations: outcome.citations }
          : {}),
      };
    };
  }

  const actions: AiAction[] = [
    {
      key: "summarize",
      label: "Summarize",
      description: "Key points as concise bullets",
      icon: ListTree,
      run: streamAction("summarize"),
      onApply: onInsertSummary,
      applyLabel: "Insert at top",
    },
    {
      key: "ask",
      label: "Ask about this page",
      description: "Answers grounded in this page only",
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
      applyLabel: "Replace page draft",
    },
    {
      key: "suggest-related",
      label: "Suggest related topics",
      description: "Ideas that extend this page",
      icon: Lightbulb,
      run: streamAction("suggest-related"),
    },
  ];

  if (!canGenerate) return null;

  return (
    <>
      <AiActionsMenu
        actions={actions}
        triggerLabel="AI"
        menuLabel="AI assist"
        align="end"
        iconOnly
      />
      <KbDocAskSheet
        scope="pages"
        docId={pageId}
        open={askOpen}
        onOpenChange={setAskOpen}
        title="Ask about this page"
        description="Ask a question — the answer is scoped to this page only."
      />
      <KbPageImproveDiffDialog
        open={improvePendingText !== null}
        proposedText={improvePendingText ?? ""}
        currentContent={currentContent}
        onApply={handleConfirmImprovement}
        onDiscard={handleDiscardImprovement}
      />
    </>
  );
}
