"use client";

import { useRef, useState } from "react";
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
import type { Citation } from "@/components/ai/ai-citation-chips";
import { KbPageImproveDiffDialog } from "./kb-page-improve-diff-dialog";

interface PendingPageChange {
  kind: "improve" | "summarize";
  text: string;
  sources: Citation[];
}

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
  const [pendingChange, setPendingChange] = useState<PendingPageChange | null>(null);
  const sourcesRef = useRef<Citation[]>([]);

  function handleApplyImprovement(text: string) {
    setPendingChange({ kind: "improve", text, sources: sourcesRef.current });
  }

  function handleInsertSummary(text: string) {
    setPendingChange({ kind: "summarize", text, sources: sourcesRef.current });
  }

  function handleConfirmChange() {
    if (pendingChange?.kind === "improve") {
      onApplyImprovement?.(pendingChange.text);
    } else if (pendingChange?.kind === "summarize") {
      onInsertSummary?.(pendingChange.text);
    }
    setPendingChange(null);
  }

  function handleDiscardChange() {
    setPendingChange(null);
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
      sourcesRef.current = [];
      const outcome = await streamKbDocAi({
        scope: "pages",
        docId: pageId,
        action,
        ...(onToken !== undefined ? { onToken } : {}),
        ...(signal !== undefined ? { signal } : {}),
      });
      if (outcome.status !== "completed") {
        throw new DOMException("AI generation was cancelled", "AbortError");
      }
      if (!outcome.citations?.length) {
        throw new Error("The source for this AI draft could not be verified. Try again.");
      }
      sourcesRef.current = outcome.citations;
      return {
        text: outcome.text,
        citations: outcome.citations,
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
      onApply: onInsertSummary ? handleInsertSummary : undefined,
      applyLabel: "Preview insertion",
      expectsCitations: true,
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
      applyLabel: "Preview changes",
      expectsCitations: true,
    },
    {
      key: "suggest-related",
      label: "Suggest related topics",
      description: "Ideas that extend this page",
      icon: Lightbulb,
      run: streamAction("suggest-related"),
      expectsCitations: true,
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
        open={pendingChange !== null}
        proposedText={pendingChange?.kind === "summarize" && currentContent
          ? `${pendingChange.text}\n${currentContent}`
          : pendingChange?.text ?? ""}
        currentContent={currentContent}
        title={pendingChange?.kind === "summarize" ? "Review summary insertion" : undefined}
        applyLabel={pendingChange?.kind === "summarize" ? "Insert summary" : undefined}
        sources={pendingChange?.sources}
        onApply={handleConfirmChange}
        onDiscard={handleDiscardChange}
      />
    </>
  );
}
