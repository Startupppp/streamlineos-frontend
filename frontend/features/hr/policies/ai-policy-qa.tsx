"use client";

import { useState } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AiDraftCard, AiConfidenceBadge } from "@/components/ai";
import type { Citation } from "@/components/ai";
import { useAIPolicyQa } from "@/hooks/api/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import type { PolicyQaResult } from "@/lib/ai/schemas";

interface AiPolicyQaProps {
  onCreateTicket?: (question: string) => void;
  className?: string;
}

export function AiPolicyQa({ onCreateTicket, className }: AiPolicyQaProps) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<PolicyQaResult | null>(null);
  const mutation = useAIPolicyQa();

  function handleSubmit() {
    if (!question.trim()) return;
    mutation.mutate(question.trim(), {
      onSuccess: (data) => setResult(data),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
  }

  function handleCreateTicket() {
    onCreateTicket?.(question);
  }

  const confidenceMap: Record<string, number> = { high: 0.9, medium: 0.6, low: 0.3, not_found: 0 };
  const citations: Citation[] = result?.citations.map((c) => ({
    id: c.policyId,
    title: c.policyType,
    snippet: c.snippet,
    href: `/hr/policies/${c.policyId}`,
  })) ?? [];

  return (
    <div className={className ?? "space-y-3"}>
      <div className="space-y-2">
        <Textarea
          placeholder="Ask about leave entitlements, attendance policy, code of conduct…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          className="resize-none text-sm"
          maxLength={1000}
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{question.length}/1000 · Ctrl+Enter to submit</span>
          <LoadingButton
            size="sm"
            isPending={mutation.isPending}
            loadingText="Searching policies…"
            onClick={handleSubmit}
            disabled={!question.trim()}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Ask HR Policy AI
          </LoadingButton>
        </div>
      </div>

      {result && (
        <AiDraftCard
          confidence={confidenceMap[result.confidence]}
          citations={citations}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AiConfidenceBadge confidence={confidenceMap[result.confidence]} />
              {result.confidence === "not_found" && (
                <Badge variant="outline" className="text-[10px] h-5 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
                  No Policy Source Found
                </Badge>
              )}
            </div>
            <p className="text-sm leading-snug">{result.answer}</p>
            <p className="text-[11px] text-muted-foreground italic">
              AI-generated response based on your organization&apos;s active HR policies. For official decisions, consult HR.
            </p>
          </div>
        </AiDraftCard>
      )}

      {result?.suggestTicket && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-300 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-snug">
            {result.escalationReason ?? "No confident policy source found for this question."}{" "}
            {onCreateTicket && (
              <button
                onClick={handleCreateTicket}
                className="underline font-medium hover:no-underline"
              >
                Create an HR helpdesk ticket
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
