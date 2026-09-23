"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from "react";
import { useReducedMotion } from "framer-motion";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Square } from "lucide-react";
import { SendIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
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
import { ChatBubble, TypingBubble, type ChatMessage } from "@/components/kb/kb-chat-bubble";

interface KbDocAskSheetProps {
  scope: KbDocAiScope;
  docId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
}

const PAGE_ASK_SUGGESTIONS = [
  "Summarize this page",
  "What are the key points?",
  "What should I do next?",
] as const;

type AskPanel = { status: "idle" } | { status: "streaming"; text: string } | AiFailureState;

export function KbDocAskSheet({
  scope,
  docId,
  open,
  onOpenChange,
  title,
  description,
}: KbDocAskSheetProps) {
  const [panel, setPanel] = useState<AskPanel>({ status: "idle" });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const invokeRef = useRef(0);
  const idRef = useRef(0);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const ask = useAiTextStream();
  const reduce = Boolean(useReducedMotion());

  useLayoutEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, panel]);

  function nextId(): string {
    idRef.current += 1;
    return `ask-${idRef.current}`;
  }

  async function runAsk(q: string, retry = false) {
    const stamp = ++invokeRef.current;
    setLastQuestion(q);
    setQuestion("");
    if (!retry) {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", content: q },
      ]);
    }
    setPanel({ status: "streaming", text: "" });
    try {
      const outcome = await ask.run((signal) =>
        streamKbDocAi({
          scope,
          docId,
          action: "ask",
          question: q,
          onToken: (token) => {
            if (invokeRef.current !== stamp) return;
            setPanel((prev) =>
              prev.status === "streaming"
                ? { status: "streaming", text: prev.text + token }
                : prev,
            );
          },
          signal,
        }),
      );
      if (invokeRef.current !== stamp || outcome.status === "busy") return;
      if (outcome.status === "cancelled") {
        setPanel({ status: "cancelled" });
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: outcome.text },
      ]);
      setPanel({ status: "idle" });
    } catch (error) {
      if (invokeRef.current !== stamp) return;
      setPanel(classifyAiError(error));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 3 || ask.isStreaming) return;
    void runAsk(trimmed);
  }

  function handleCancel() {
    if (!ask.isStreaming) return;
    invokeRef.current += 1;
    ask.stop();
    setPanel({ status: "cancelled" });
  }

  function handleRetry() {
    if (lastQuestion) void runAsk(lastQuestion, true);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) return;
    invokeRef.current += 1;
    ask.stop();
    setPanel({ status: "idle" });
    setMessages([]);
    setQuestion("");
    setLastQuestion("");
  }

  function handleQuestionChange(event: ChangeEvent<HTMLInputElement>) {
    setQuestion(event.target.value);
  }

  function handleSuggestionClick(event: MouseEvent<HTMLButtonElement>) {
    const next = event.currentTarget.dataset.suggestion;
    if (!next || ask.isStreaming) return;
    void runAsk(next);
  }

  const isStreaming = panel.status === "streaming";
  const showEmpty = messages.length === 0 && !isStreaming && panel.status === "idle";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 pr-12">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          <SheetDescription className="text-label text-muted-foreground">
            {description}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-3 px-4 py-4">
          {showEmpty ? (
            <div className="flex min-h-full flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm font-semibold text-foreground">Ask this page</p>
              <p className="max-w-[18rem] text-xs text-muted-foreground">
                Answers stay grounded in this document only.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {PAGE_ASK_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    data-suggestion={suggestion}
                    onClick={handleSuggestionClick}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} reduce={reduce} />
              ))}
              {isStreaming && panel.text ? (
                <ChatBubble
                  message={{ id: "draft", role: "assistant", content: panel.text }}
                  reduce={reduce}
                />
              ) : null}
              {isStreaming && !panel.text ? <TypingBubble reduce={reduce} /> : null}
            </>
          )}

          {panel.status === "quota" && <AiQuotaEmptyState variant="fill" />}
          {panel.status === "denied" && <AiPermissionDenied reason={panel.reason} />}
          {panel.status === "queued" && (
            <AiQueuedNotice message={panel.message} onRetry={handleRetry} />
          )}
          {panel.status === "unavailable" && (
            <AiUnavailableNotice message={panel.message} onRetry={handleRetry} />
          )}
          {panel.status === "offline" && (
            <AiOfflineNotice message={panel.message} onRetry={handleRetry} />
          )}
          {panel.status === "cancelled" && <AiCancelledNotice onRetry={handleRetry} />}
          {panel.status === "error" && (
            <ChatBubble
              message={{ id: "error", role: "assistant", content: panel.message, isError: true }}
              reduce={reduce}
            />
          )}
          <div ref={threadEndRef} />
        </SheetBody>

        <form
          onSubmit={handleSubmit}
          className="flex shrink-0 items-center gap-2 border-t border-border bg-background px-4 py-3"
        >
          <Input
            autoFocus
            value={question}
            onChange={handleQuestionChange}
            placeholder="Ask about this page…"
            aria-label="Question"
            disabled={isStreaming}
            className="min-w-0 flex-1 rounded-xl"
          />
          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={handleCancel}
              className="h-9 w-9 shrink-0 rounded-xl"
              aria-label="Stop"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <AnimatedIconButton
              type="submit"
              size="icon"
              icon={SendIcon}
              iconSize={16}
              disabled={question.trim().length < 3}
              className="h-9 w-9 shrink-0 rounded-xl"
              aria-label="Send"
            />
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
