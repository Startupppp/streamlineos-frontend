"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useKbAsk } from "@/hooks/api/kb/ask";
import { pageHref } from "@/features/knowledge-base/lib/knowledge-routes";
import {
  KbMessageSquareIcon,
  KbFileTextIcon,
} from "@/features/knowledge-base/lib/kb-icons";
import { getApiError } from "@/lib/api-client";
import type { KbAskResponse } from "@/types/kb";

const SUGGESTIONS = [
  "Summarize the key points across my pages",
  "What processes are documented here?",
  "Where can I find onboarding information?",
];

export default function KnowledgeAskPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<KbAskResponse | null>(null);
  const ask = useKbAsk();

  function runAsk(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    ask.mutate(
      { question: trimmed },
      {
        onSuccess: (data) => setResult(data),
        onError: (error) =>
          toast.error("Ask failed", { description: getApiError(error) }),
      },
    );
  }

  function handleQuestionChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuestion(e.target.value);
  }

  function handleAsk() {
    runAsk(question);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAsk();
    }
  }

  function handleSuggestion(e: React.MouseEvent<HTMLButtonElement>) {
    const value = e.currentTarget.dataset.suggestion ?? "";
    setQuestion(value);
    runAsk(value);
  }

  function handleCitationClick(e: React.MouseEvent<HTMLButtonElement>) {
    const pageId = Number(e.currentTarget.dataset.pageId);
    if (pageId) router.push(pageHref(pageId));
  }

  return (
    <PageWrapper
      eyebrow="Knowledge Base"
      title="Ask AI"
      subtitle="Get grounded answers from across your wiki pages and uploaded documents."
    >
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex gap-2">
          <Input
            value={question}
            onChange={handleQuestionChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your knowledge base…"
            className="h-11 text-sm"
            autoFocus
          />
          <Button
            onClick={handleAsk}
            disabled={ask.isPending || !question.trim()}
            className="h-11 shrink-0"
          >
            {ask.isPending ? "Asking…" : "Ask"}
          </Button>
        </div>

        {!result && !ask.isPending && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Try asking</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  data-suggestion={s}
                  onClick={handleSuggestion}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {ask.isPending && (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            Searching the knowledge base…
          </div>
        )}

        {result && !ask.isPending && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <KbMessageSquareIcon className="h-3.5 w-3.5" />
              Answer
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {result.answer}
            </p>

            {result.citations.length > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Sources
                </p>
                <div className="space-y-1">
                  {result.citations.map((citation, index) =>
                    citation.kind === "page" ? (
                      <button
                        key={`page-${citation.pageId}-${index}`}
                        type="button"
                        data-page-id={citation.pageId}
                        onClick={handleCitationClick}
                        className="flex w-full items-center gap-2 truncate rounded-md px-2 py-1.5 text-left text-sm text-accent transition-colors hover:bg-muted"
                      >
                        <KbFileTextIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{citation.title || "Untitled"}</span>
                      </button>
                    ) : (
                      <div
                        key={`article-${citation.articleId}-${index}`}
                        className="flex items-center gap-2 truncate px-2 py-1.5 text-sm text-muted-foreground"
                      >
                        <KbFileTextIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{citation.title || "Untitled"}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
