"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MessageSquare, Square } from "lucide-react";
import { SendIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { AiDraftCard } from "@/components/ai/ai-draft-card";
import { AiQuotaEmptyState } from "@/components/ai/ai-quota-empty-state";
import { AiPermissionDenied } from "@/components/ai/ai-permission-denied";
import {
  AiCancelledNotice,
  AiOfflineNotice,
  AiQueuedNotice,
  AiUnavailableNotice,
} from "@/components/ai/ai-state-notices";
import { classifyAiError, type AiFailureState } from "@/components/ai";
import { useAiTextStream } from "@/hooks/api/ai-text-stream";
import { streamKbDocAi, type KbDocAiScope } from "@/hooks/api/kb/doc-ai-stream";

interface KbDocAskSheetProps {
  scope: KbDocAiScope;
  docId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
}

type AskState =
  | { status: "input" }
  | { status: "streaming"; text: string }
  | { status: "ready"; text: string }
  | AiFailureState;

/**
 * The ask affordance for both KB document surfaces. The answer streams, so the
 * panel appends what has arrived rather than holding a skeleton until the last
 * token, and Stop keeps the partial answer — the tokens that arrived were paid
 * for. The wiki page and help-centre article panels rendered two copies of this
 * with two slightly different state machines; this is the one.
 */
export function KbDocAskSheet({
  scope,
  docId,
  open,
  onOpenChange,
  title,
  description,
}: KbDocAskSheetProps) {
  const [state, setState] = useState<AskState>({ status: "input" });
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const invokeRef = useRef(0);
  const ask = useAiTextStream();

  async function runAsk(q: string) {
    const stamp = ++invokeRef.current;
    setLastQuestion(q);
    setState({ status: "streaming", text: "" });
    try {
      const outcome = await ask.run((signal) =>
        streamKbDocAi({
          scope,
          docId,
          action: "ask",
          question: q,
          onToken: (token) => {
            if (invokeRef.current !== stamp) return;
            setState((prev) =>
              prev.status === "streaming" ? { status: "streaming", text: prev.text + token } : prev,
            );
          },
          signal,
        }),
      );
      if (invokeRef.current !== stamp || outcome.status === "busy") return;
      if (outcome.status === "cancelled") setState({ status: "cancelled" });
      else setState({ status: "ready", text: outcome.text });
    } catch (error) {
      if (invokeRef.current !== stamp) return;
      setState(classifyAiError(error));
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 3) return;
    void runAsk(trimmed);
  }

  function handleCancel() {
    if (!ask.isStreaming) return;
    invokeRef.current += 1;
    ask.stop();
    setState({ status: "cancelled" });
  }

  function handleRetry() {
    if (lastQuestion) void runAsk(lastQuestion);
  }

  function handleAskAnother() {
    setState({ status: "input" });
    setQuestion("");
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) return;
    invokeRef.current += 1;
    ask.stop();
    setState({ status: "input" });
    setQuestion("");
  }

  function handleQuestionChange(e: ChangeEvent<HTMLInputElement>) {
    setQuestion(e.target.value);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          <SheetDescription className="text-label text-muted-foreground">
            {description}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {state.status === "input" && (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <MessageSquare
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  autoFocus
                  value={question}
                  onChange={handleQuestionChange}
                  placeholder="Ask about this page…"
                  aria-label="Question"
                  className="h-9 pl-9"
                />
              </div>
              <AnimatedIconButton
                type="submit"
                size="icon"
                icon={SendIcon}
                iconSize={16}
                disabled={question.trim().length < 3}
                className="h-9 w-9 shrink-0"
                aria-label="Ask"
              />
            </form>
          )}

          {state.status === "streaming" && (
            <div className="space-y-3">
              <p
                className="whitespace-pre-wrap text-label leading-relaxed text-foreground"
                aria-live="polite"
              >
                {state.text}
              </p>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCancel}
                className="h-9 w-9"
                aria-label="Stop"
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {state.status === "quota" && <AiQuotaEmptyState variant="fill" />}
          {state.status === "denied" && <AiPermissionDenied reason={state.reason} />}
          {state.status === "queued" && (
            <AiQueuedNotice message={state.message} onRetry={handleRetry} />
          )}
          {state.status === "unavailable" && (
            <AiUnavailableNotice message={state.message} onRetry={handleRetry} />
          )}
          {state.status === "offline" && (
            <AiOfflineNotice message={state.message} onRetry={handleRetry} />
          )}
          {state.status === "cancelled" && <AiCancelledNotice onRetry={handleRetry} />}

          {state.status === "error" && (
            <div className="flex flex-col items-start gap-3 py-4">
              <p className="text-sm text-muted-foreground">{state.message}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="h-8 text-xs"
              >
                Retry
              </Button>
            </div>
          )}

          {state.status === "ready" && (
            <>
              <div className="mb-3">
                <p className="text-xs font-medium text-muted-foreground">Your question</p>
                <p className="text-label text-foreground mt-0.5">{lastQuestion}</p>
              </div>
              <AiDraftCard>
                <p className="whitespace-pre-wrap text-label leading-relaxed text-foreground">
                  {state.text}
                </p>
              </AiDraftCard>
              <AnimatedIconButton
                type="button"
                variant="ghost"
                size="sm"
                icon={SendIcon}
                iconSize={14}
                iconClassName="mr-1.5"
                className="h-9"
                onClick={handleAskAnother}
                aria-label="Ask another question"
              >
                Ask another
              </AnimatedIconButton>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
