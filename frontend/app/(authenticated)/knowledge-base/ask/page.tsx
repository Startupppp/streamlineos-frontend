"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, LifeBuoy, Sparkles, WalletCards } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { AskAnswer } from "@/components/kb/ask-answer";
import { useKbAsk } from "@/lib/api/hooks/kb";
import { getApiError } from "@/lib/api-client";

function isCreditError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes("credit");
}

export default function KnowledgeBaseAskPage() {
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState(searchParams.get("q") ?? "");

  const askMutation = useKbAsk();

  function handleQuestionChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setQuestion(event.target.value);
  }

  function handleAsk() {
    const trimmed = question.trim();
    if (!trimmed || askMutation.isPending) return;
    askMutation.mutate({ question: trimmed });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleAsk();
  }

  function renderResult() {
    if (askMutation.isPending) {
      return (
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Thinking…
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-3/4" />
          </CardContent>
        </Card>
      );
    }

    if (askMutation.isError) {
      if (isCreditError(askMutation.error)) {
        return (
          <EmptyState
            illustration={<WalletCards className="text-muted-foreground" />}
            title="You're out of AI credits"
            description="Top up your balance to keep asking the knowledge base assistant."
            action={{ label: "Top up credits", href: "/billing" }}
            className="min-h-[40vh]"
          />
        );
      }
      return (
        <ErrorState
          title="Couldn't generate an answer"
          description={getApiError(askMutation.error)}
          onRetry={handleAsk}
          className="min-h-[40vh]"
        />
      );
    }

    if (askMutation.data) {
      const { answer, citations, hasContext } = askMutation.data;
      return (
        <Card>
          <CardContent className="space-y-5 py-4">
            <AskAnswer answer={answer} citations={citations} />
            {!hasContext && (
              <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border/70 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Still need help? Reach out to our support team.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/support">
                    <LifeBuoy className="mr-1.5 h-4 w-4" /> Open a support ticket
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <EmptyState
        illustration={<EmptySearchIllustration />}
        title="Ask the knowledge base"
        description="Ask a question in plain language and get an answer drawn from your published articles."
        className="min-h-[40vh]"
      />
    );
  }

  return (
    <PageWrapper
      eyebrow="Knowledge Base"
      title="Ask AI"
      subtitle="Get instant answers sourced from your knowledge base articles."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/knowledge-base/search">Search instead</Link>
        </Button>
      }
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={question}
            onChange={handleQuestionChange}
            placeholder="e.g. How do I reset my password?"
            aria-label="Your question"
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!question.trim() || askMutation.isPending}>
              {askMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              Ask
            </Button>
          </div>
        </form>

        {renderResult()}
      </div>
    </PageWrapper>
  );
}
