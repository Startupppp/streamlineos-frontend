"use client";

import { useState } from "react";
import { AiActionsMenu, type AiAction, type AiActionResult } from "@/components/ai";
import { KbDocAskSheet } from "@/components/kb/kb-doc-ask-sheet";
import { streamKbDocAi, type KbDocAiAction } from "@/hooks/api/kb/doc-ai-stream";
import { useCan } from "@/hooks/api/access";

interface KbPageAiActionsProps {
  pageId: number;
  onApplyImprovement?: (text: string) => void;
  onInsertSummary?: (text: string) => void;
}

/**
 * The three generating actions stream. This panel used to hand-roll the menu,
 * the result sheet, the in-flight guard and the error classification that
 * `AiActionsMenu` already owns — including a streaming state it never reached,
 * because every action awaited a whole buffered answer first. `improve` declares
 * a 1024-token ceiling, which a buffered call could not reliably deliver inside
 * the client's own cap on non-streaming requests.
 */
export function KbPageAiActions({
  pageId,
  onApplyImprovement,
  onInsertSummary,
}: KbPageAiActionsProps) {
  const canGenerate = useCan("kb:ai:generate");
  const [askOpen, setAskOpen] = useState(false);

  function handleApplyImprovement(text: string) {
    onApplyImprovement?.(text);
  }

  function handleInsertSummary(text: string) {
    onInsertSummary?.(text);
  }

  function streamAction(action: KbDocAiAction) {
    return async (signal?: AbortSignal, onToken?: (chunk: string) => void): Promise<AiActionResult> => {
      const outcome = await streamKbDocAi({
        scope: "pages",
        docId: pageId,
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
      label: "Summarize this page",
      description: "Concise bullet-point summary",
      run: streamAction("summarize"),
      onApply: onInsertSummary ? handleInsertSummary : undefined,
      applyLabel: "Insert at top",
    },
    {
      key: "ask",
      label: "Ask about this page",
      description: "Question scoped to this document only",
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
      applyLabel: "Replace page draft",
    },
    {
      key: "suggest-related",
      label: "Suggest related topics",
      description: "Topics that complement this page",
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
    </>
  );
}
