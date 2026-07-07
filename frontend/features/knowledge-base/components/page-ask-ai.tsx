"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KbMessageSquareIcon } from "@/features/knowledge-base/lib/kb-icons";
import { useKbAsk } from "@/hooks/api/kb/ask";
import { getApiError } from "@/lib/api-client";
import type { KbAskResponse } from "@/types/kb";

interface PageAskAiProps {
  spaceId: number | null;
  onNavigate: (pageId: number) => void;
}

export default function PageAskAi({ spaceId, onNavigate }: PageAskAiProps) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<KbAskResponse | null>(null);
  const ask = useKbAsk();

  function handleQuestionChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuestion(e.target.value);
  }

  function handleAsk() {
    const trimmed = question.trim();
    if (!trimmed) return;
    ask.mutate(spaceId ? { question: trimmed, spaceId } : { question: trimmed }, {
      onSuccess: (data) => setResult(data),
      onError: (error) => toast.error("Ask failed", { description: getApiError(error) }),
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAsk();
    }
  }

  function handleCitationClick(e: React.MouseEvent<HTMLButtonElement>) {
    const pageId = Number(e.currentTarget.dataset.pageId);
    if (pageId) onNavigate(pageId);
  }

  return (
    <section>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
        <KbMessageSquareIcon className="h-3 w-3" />
        Ask AI
      </p>
      <div className="flex gap-1.5">
        <Input
          value={question}
          onChange={handleQuestionChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask this knowledge base…"
          className="h-8 text-xs"
        />
        <Button
          size="sm"
          onClick={handleAsk}
          disabled={ask.isPending || !question.trim()}
          className="h-8 text-xs shrink-0"
        >
          {ask.isPending ? "…" : "Ask"}
        </Button>
      </div>

      {ask.isPending && (
        <p className="mt-2 text-xs text-muted-foreground">Searching the knowledge base…</p>
      )}

      {result && !ask.isPending && (
        <div className="mt-3 space-y-2">
          <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground">
            {result.answer}
          </p>
          {result.citations.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Sources
              </p>
              {result.citations.map((citation, index) =>
                citation.kind === "page" ? (
                  <button
                    key={`page-${citation.pageId}-${index}`}
                    type="button"
                    data-page-id={citation.pageId}
                    onClick={handleCitationClick}
                    className="block w-full truncate rounded px-1 py-0.5 text-left text-xs text-accent hover:bg-muted"
                  >
                    {citation.title || "Untitled"}
                  </button>
                ) : (
                  <div
                    key={`${citation.kind}-${index}`}
                    className="truncate px-1 py-0.5 text-xs text-muted-foreground"
                  >
                    {citation.title || "Untitled"}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
