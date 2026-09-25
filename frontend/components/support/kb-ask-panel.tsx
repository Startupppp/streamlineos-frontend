"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Sparkles, Send, ThumbsUp, ThumbsDown, BookMarked, FileText, Paperclip } from "lucide-react";
import Link from "next/link";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { AiCitationChips, type Citation } from "@/components/ai/ai-citation-chips";
import { AiUsageChip } from "@/components/ai/ai-usage-chip";
import { useKbAsk, useKbAiAnswerFeedback } from "@/hooks/api/kb/ask";
import { isAiStreamAbort } from "@/hooks/api/ai-text-stream";
import { usePublicAskSupportKb, type KbAnswer } from "@/hooks/api/support/kb-rag";
import type { KbAskResponse, KbAskCitation } from "@/types/kb";
import { companyDocumentHref } from "@/lib/knowledge-routes";

type KbAskPanelProps =
  | { mode: "authed"; articleId?: number; className?: string }
  | { mode: "public"; orgId: string; className?: string };

const MIN_QUESTION_LENGTH = 3;

function buildCitations(citations: KbAskCitation[]): Citation[] {
  return citations.map((c) => {
    const freshness = c.updatedAt;
    if (c.kind === "article") {
      return { id: `a-${c.articleId}`, title: c.title, href: `/support/kb/${c.articleId}`, freshness };
    }
    if (c.kind === "page") {
      return { id: `p-${c.pageId}`, title: c.title, freshness };
    }
    if (c.kind === "document") {
      return { id: `d-${c.linkedDocumentId}`, title: c.title, href: companyDocumentHref(c.linkedDocumentId), freshness };
    }
    return { id: `s-${c.sourceId}`, title: c.title, freshness };
  });
}

function PublicSourceLink({ source, orgId }: { source: { articleId: number; title: string; slug: string; attachmentName: string | null }; orgId: string }) {
  return (
    <Link
      href={`/help/${orgId}/${source.slug}`}
      className="flex items-center gap-1.5 text-xs text-primary hover:underline min-w-0"
    >
      {source.attachmentName ? (
        <Paperclip className="h-3 w-3 shrink-0" />
      ) : (
        <FileText className="h-3 w-3 shrink-0" />
      )}
      <TruncatedText text={`${source.title}${source.attachmentName ? ` · ${source.attachmentName}` : ""}`} />
    </Link>
  );
}

type FeedbackRating = "helpful" | "not_helpful" | "missing_source";

function AnswerFeedback({ question, onGiven }: { question: string; onGiven: () => void }) {
  const feedbackMutation = useKbAiAnswerFeedback();

  function handleFeedback(rating: FeedbackRating) {
    feedbackMutation.mutate(
      { rating, question },
      {
        onSuccess: () => {
          toast.success("Thanks for the feedback");
          onGiven();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <div className="flex items-center gap-1 pt-1 border-t">
      <span className="text-micro text-muted-foreground mr-1">Helpful?</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-1.5 text-dense gap-1"
        onClick={() => handleFeedback("helpful")}
        disabled={feedbackMutation.isPending}
      >
        <ThumbsUp className="h-3 w-3" /> Yes
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-1.5 text-dense gap-1"
        onClick={() => handleFeedback("not_helpful")}
        disabled={feedbackMutation.isPending}
      >
        <ThumbsDown className="h-3 w-3" /> No
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-1.5 text-dense gap-1"
        onClick={() => handleFeedback("missing_source")}
        disabled={feedbackMutation.isPending}
      >
        <BookMarked className="h-3 w-3" /> Missing source
      </Button>
    </div>
  );
}

function AuthedAskPanel({ className, articleId }: { className?: string; articleId?: number }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<KbAskResponse | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [draft, setDraft] = useState("");
  const askMutation = useKbAsk();
  const submissionRef = useRef(0);

  function handleQuestionChange(event: ChangeEvent<HTMLInputElement>) {
    setQuestion(event.target.value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitQuestion();
  }

  function submitQuestion() {
    const trimmed = question.trim();
    if (trimmed.length < MIN_QUESTION_LENGTH) {
      toast.error("Please enter a longer question");
      return;
    }
    if (askMutation.isPending) return;
    const id = ++submissionRef.current;
    setFeedbackGiven(false);
    setDraft("");
    setAnswer(null);
    function handleToken(token: string) {
      if (submissionRef.current === id) setDraft((current) => current + token);
    }
    askMutation.mutate(
      { question: trimmed, onToken: handleToken },
      {
        onSuccess: (data) => {
          if (submissionRef.current !== id) return;
          setAnswer(data);
          setDraft("");
        },
        onError: (e) => {
          if (submissionRef.current !== id) return;
          if (isAiStreamAbort(e)) return;
          toast.error(getErrorMessage(e));
        },
      },
    );
  }

  function handleFeedbackGiven() {
    setFeedbackGiven(true);
  }
  function handleStop() { askMutation.stop(); }
  function handleRegenerate() { askMutation.resetAttempt(); submitQuestion(); }

  const citations = answer ? buildCitations(answer.citations) : [];

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
            <p className="text-sm font-semibold leading-none">Ask the knowledge base</p>
            <p className="text-dense text-muted-foreground">
              Get answers from articles and attached documents
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={question}
            onChange={handleQuestionChange}
            placeholder="e.g. How do I reset my password?"
            className="flex-1 text-label"
            disabled={askMutation.isPending}
          />
          <LoadingButton
            type="submit"
            size="sm"
            isPending={askMutation.isPending}
            loadingText="Thinking…"
            disabled={question.trim().length < MIN_QUESTION_LENGTH}
            className="gap-1.5 text-xs shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            Ask
          </LoadingButton>
        </form>
        {askMutation.isPending && <Button variant="outline" onClick={handleStop}>Stop generating</Button>}
        {draft && <p className="whitespace-pre-wrap text-label" aria-label="Answer draft">{draft}</p>}
        {draft && !askMutation.isPending && !answer && <p role="status" className="text-xs text-muted-foreground">This answer is incomplete.</p>}
        {askMutation.isError && !askMutation.isPending && <Button variant="outline" onClick={handleRegenerate}>Generate a new answer</Button>}
        {answer && !askMutation.isPending && (
          <div className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-label whitespace-pre-wrap leading-relaxed flex-1">{answer.answer}</p>
              <AiUsageChip usage={answer.aiUsage} className="shrink-0 mt-0.5" />
            </div>
            {citations.length > 0 && (
              <div className="space-y-1 pt-1 border-t">
                <p className="text-micro font-medium uppercase tracking-wide text-muted-foreground">
                  Sources
                </p>
                <AiCitationChips citations={citations} />
              </div>
            )}
            {answer.hasContext ? (
              feedbackGiven ? (
                <p className="text-micro text-muted-foreground pt-1 border-t">Thanks for the feedback</p>
              ) : (
                <AnswerFeedback question={question} onGiven={handleFeedbackGiven} />
              )
            ) : (
              <EmptyState
                compact
                className="pt-1 border-t"
                title="No knowledge-base sources matched"
                description="Nothing in your articles or attachments covers this yet, so the answer above is not grounded in your knowledge base."
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PublicAskPanel({ className, orgId }: { className?: string; orgId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<KbAnswer | null>(null);
  const publicAsk = usePublicAskSupportKb();
  const submissionRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => () => {
    submissionRef.current += 1;
    controllerRef.current?.abort();
  }, [orgId]);

  function handleStop() { controllerRef.current?.abort(); }

  function handleQuestionChange(event: ChangeEvent<HTMLInputElement>) {
    setQuestion(event.target.value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < MIN_QUESTION_LENGTH) {
      toast.error("Please enter a longer question");
      return;
    }
    if (controllerRef.current) return;
    const id = ++submissionRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    setDraft("");
    setAnswer(null);
    function handleToken(token: string) {
      if (submissionRef.current === id && !controller.signal.aborted)
        setDraft((current) => current + token);
    }
    publicAsk.mutate(
      { orgId, question: trimmed, signal: controller.signal, onToken: handleToken },
      {
        onSuccess: (data) => {
          if (submissionRef.current !== id) return;
          setAnswer(data);
          setDraft("");
        },
        onError: (e) => {
          if (submissionRef.current !== id) return;
          if (isAiStreamAbort(e)) return;
          toast.error(getErrorMessage(e));
        },
        onSettled: () => {
          if (controllerRef.current === controller) controllerRef.current = null;
        },
      },
    );
  }

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-sm font-semibold leading-none">Ask the knowledge base</p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={question}
            onChange={handleQuestionChange}
            placeholder="e.g. How do I reset my password?"
            className="flex-1 text-label"
            disabled={publicAsk.isPending}
          />
          <LoadingButton
            type="submit"
            size="sm"
            isPending={publicAsk.isPending}
            loadingText="Thinking…"
            disabled={question.trim().length < MIN_QUESTION_LENGTH}
            className="gap-1.5 text-xs shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            Ask
          </LoadingButton>
        </form>

        {publicAsk.isPending && <Button variant="outline" onClick={handleStop}>Stop generating</Button>}
        {draft && <p className="whitespace-pre-wrap text-label" aria-label="Answer draft">{draft}</p>}
        {draft && !publicAsk.isPending && !answer && <p role="status" className="text-xs text-muted-foreground">This answer is incomplete.</p>}
        {answer && !publicAsk.isPending && (
          <div className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
            <p className="text-label whitespace-pre-wrap leading-relaxed">{answer.answer}</p>
            {answer.sources.length > 0 && (
              <div className="space-y-1 pt-1 border-t">
                <p className="text-micro font-medium uppercase tracking-wide text-muted-foreground">Sources</p>
                <div className="flex flex-col gap-0.5">
                  {answer.sources.map((source) => (
                    <PublicSourceLink
                      key={`${source.articleId}-${source.attachmentId ?? "body"}`}
                      source={source}
                      orgId={orgId}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KbAskPanel(props: KbAskPanelProps) {
  if (props.mode === "public") {
    return <PublicAskPanel orgId={props.orgId} className={props.className} />;
  }
  return <AuthedAskPanel articleId={props.articleId} className={props.className} />;
}
