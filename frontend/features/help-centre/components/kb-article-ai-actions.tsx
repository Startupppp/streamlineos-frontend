"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { AiActionsMenu, type AiAction, type AiActionResult } from "@/components/ai";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AiDraftCard } from "@/components/ai/ai-draft-card";
import { AiQuotaEmptyState } from "@/components/ai/ai-quota-empty-state";
import { AiPermissionDenied } from "@/components/ai/ai-permission-denied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-client";
import {
  useKbArticleSummarize,
  useKbArticleAsk,
  useKbArticleImprove,
  useKbArticleSuggestRelated,
} from "@/hooks/api/kb/article-ai";
import { useCan } from "@/hooks/api/access";

interface KbArticleAiActionsProps {
  articleId: number;
  onApplyImprovement?: (text: string) => void;
}

import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";

type AskPanelState =
  | { status: "input" }
  | { status: "loading" }
  | { status: "ready"; text: string; aiUsage?: AiUsageMeta | null }
  | { status: "quota" }
  | { status: "denied"; reason: string }
  | { status: "error"; message: string };

export function KbArticleAiActions({ articleId, onApplyImprovement }: KbArticleAiActionsProps) {
  const canGenerate = useCan("kb:ai:generate");
  const [askOpen, setAskOpen] = useState(false);
  const [askState, setAskState] = useState<AskPanelState>({ status: "input" });
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");

  const summarize = useKbArticleSummarize(articleId);
  const askMutation = useKbArticleAsk(articleId);
  const improve = useKbArticleImprove(articleId);
  const suggestRelated = useKbArticleSuggestRelated(articleId);

  async function runAsk(q: string) {
    setLastQuestion(q);
    setAskState({ status: "loading" });
    try {
      const res = await askMutation.mutateAsync(q);
      setAskState({ status: "ready", text: res.text, aiUsage: res.aiUsage });
    } catch (err) {
      if (isApiError(err) && err.status === 402) { setAskState({ status: "quota" }); return; }
      if (isApiError(err) && err.status === 403) { setAskState({ status: "denied", reason: getErrorMessage(err) }); return; }
      setAskState({ status: "error", message: getErrorMessage(err) });
    }
  }

  function handleAskSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 3) return;
    void runAsk(trimmed);
  }

  function handleAskRetry() {
    if (lastQuestion) void runAsk(lastQuestion);
  }

  function handleAskOpenChange(open: boolean) {
    setAskOpen(open);
    if (!open) { setAskState({ status: "input" }); setQuestion(""); }
  }

  function handleQuestionChange(e: ChangeEvent<HTMLInputElement>) {
    setQuestion(e.target.value);
  }

  function handleApplyImprovement(text: string) {
    onApplyImprovement?.(text);
    toast.success("Improvement draft ready — paste it into the editor");
  }

  const actions: AiAction[] = [
    {
      key: "summarize",
      label: "Summarize this article",
      description: "Concise bullet-point summary",
      run: async (): Promise<AiActionResult> => {
        const res = await summarize.mutateAsync();
        return { text: res.text, aiUsage: res.aiUsage };
      },
    },
    {
      key: "ask",
      label: "Ask about this article",
      description: "Question scoped to this article only",
      run: async (): Promise<AiActionResult> => {
        setAskState({ status: "input" });
        setQuestion("");
        setAskOpen(true);
        return { text: "" };
      },
    },
    {
      key: "improve",
      label: "Improve writing",
      description: "Get a rewritten draft — you apply it",
      run: async (): Promise<AiActionResult> => {
        const res = await improve.mutateAsync();
        return { text: res.text, aiUsage: res.aiUsage };
      },
      onApply: onApplyImprovement ? handleApplyImprovement : undefined,
      applyLabel: "Apply draft",
    },
    {
      key: "suggest-related",
      label: "Suggest related topics",
      description: "Topics that complement this article",
      run: async (): Promise<AiActionResult> => {
        const res = await suggestRelated.mutateAsync();
        return { text: res.text, aiUsage: res.aiUsage };
      },
    },
  ];

  if (!canGenerate) return null;

  return (
    <>
      <AiActionsMenu actions={actions} triggerLabel="AI" menuLabel="AI assist" align="end" />

      <Sheet open={askOpen} onOpenChange={handleAskOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
            <SheetTitle className="text-base font-semibold">Ask about this article</SheetTitle>
            <SheetDescription className="text-label text-muted-foreground">
              Ask a question — the answer is grounded in this article only.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {askState.status === "input" && (
              <form onSubmit={handleAskSubmit} className="flex flex-col gap-3">
                <Input
                  autoFocus
                  value={question}
                  onChange={handleQuestionChange}
                  placeholder="e.g. What are the prerequisites?"
                  className="text-label"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={question.trim().length < 3}
                  className="self-start"
                >
                  Ask
                </Button>
              </form>
            )}

            {askState.status === "loading" && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            )}

            {askState.status === "quota" && <AiQuotaEmptyState variant="fill" />}

            {askState.status === "denied" && <AiPermissionDenied reason={askState.reason} />}

            {askState.status === "error" && (
              <div className="flex flex-col items-start gap-3 py-4">
                <p className="text-sm text-muted-foreground">{askState.message}</p>
                <Button type="button" variant="outline" size="sm" onClick={handleAskRetry} className="h-8 text-xs">
                  Retry
                </Button>
              </div>
            )}

            {askState.status === "ready" && (
              <>
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground">Your question</p>
                  <p className="text-label text-foreground mt-0.5">{lastQuestion}</p>
                </div>
                <AiDraftCard usage={askState.aiUsage}>
                  <p className="whitespace-pre-wrap text-label leading-relaxed text-foreground">
                    {askState.text}
                  </p>
                </AiDraftCard>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setAskState({ status: "input" })}
                >
                  Ask another question
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
