"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Sparkles, Send, Loader2, FileText, Paperclip } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getApiError } from "@/lib/api-client";
import {
  useAskKb,
  usePublicAskKb,
  type KbAnswer,
  type KbAnswerSource,
} from "@/hooks/api/support/kb-rag";

type KbAskPanelProps =
  | { mode: "authed"; articleId?: number; className?: string }
  | { mode: "public"; orgId: string; className?: string };

const MIN_QUESTION_LENGTH = 3;

export function KbAskPanel(props: KbAskPanelProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<KbAnswer | null>(null);

  const authedAsk = useAskKb();
  const publicAsk = usePublicAskKb();
  const isPending = props.mode === "public" ? publicAsk.isPending : authedAsk.isPending;

  function handleQuestionChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setQuestion(event.target.value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < MIN_QUESTION_LENGTH) {
      toast.error("Please enter a longer question");
      return;
    }
    const handlers = {
      onSuccess: (data: KbAnswer) => setAnswer(data),
      onError: (error: unknown) => toast.error(getApiError(error)),
    };
    if (props.mode === "public") {
      publicAsk.mutate({ orgId: props.orgId, question: trimmed }, handlers);
    } else {
      authedAsk.mutate({ question: trimmed, articleId: props.articleId }, handlers);
    }
  }

  function buildSourceHref(source: KbAnswerSource): string {
    if (props.mode === "public") {
      return `/help/${props.orgId}/${source.slug}`;
    }
    return `/kb/${source.articleId}`;
  }

  return (
    <Card className={cn("border-primary/20", props.className)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none">Ask the knowledge base</p>
            <p className="text-xs text-muted-foreground mt-1">
              Get answers from articles and attached documents.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={question}
            onChange={handleQuestionChange}
            placeholder="e.g. How do I reset my password?"
            rows={2}
            className="resize-none text-sm"
            disabled={isPending}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isPending || question.trim().length < MIN_QUESTION_LENGTH}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="ml-1.5">{isPending ? "Thinking…" : "Ask"}</span>
            </Button>
          </div>
        </form>

        {answer && !isPending && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{answer.answer}</p>
            {answer.sources.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Sources
                </p>
                <div className="flex flex-col gap-1">
                  {answer.sources.map((source) => (
                    <Link
                      key={`${source.articleId}-${source.attachmentId ?? "body"}`}
                      href={buildSourceHref(source)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline min-w-0"
                    >
                      {source.attachmentName ? (
                        <Paperclip className="h-3 w-3 shrink-0" />
                      ) : (
                        <FileText className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">
                        {source.title}
                        {source.attachmentName ? ` · ${source.attachmentName}` : ""}
                      </span>
                    </Link>
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
