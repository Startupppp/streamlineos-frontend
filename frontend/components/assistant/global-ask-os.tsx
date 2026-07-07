"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import { Bot, ChevronDown, Loader2, Send, Square, Trash2, X } from "lucide-react";
import { AnimatedLogo } from "@/features/landing/components/animated-logo";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import {
  useAskAI,
  useAskAiHistory,
  useClearAskAiHistory,
  type AskAIMessage,
  type AskAiHistoryMessage,
  type AskAiHistoryPage,
} from "@/hooks/api";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";

const SUGGESTIONS = [
  "Summarize my day",
  "What are my hot leads right now?",
  "Search the knowledge base for our leave policy",
  "Create a task to follow up tomorrow",
];

const CONTEXT_WINDOW = 24;

interface Draft {
  user: string;
  assistant: string;
}

export function GlobalAskOs() {
  const reduce = useReducedMotion();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const loadingOlderRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const assistantBufRef = useRef("");
  const tempIdRef = useRef(0);

  const { sendMessage, stop, isStreaming } = useAskAI();
  const clearHistory = useClearAskAiHistory();
  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useAskAiHistory(open);

  const persisted = useMemo<AskAiHistoryMessage[]>(
    () => (data?.pages ?? []).flatMap((page) => page.messages).slice().reverse(),
    [data],
  );

  const loadOlder = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingOlderRef.current || !hasNextPage || isFetchingNextPage) return;
    prevScrollHeightRef.current = el.scrollHeight;
    loadingOlderRef.current = true;
    void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const root = scrollRef.current;
    if (!open || !sentinel || !root || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadOlder();
      },
      { root, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasNextPage, loadOlder]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !open) return;
    if (loadingOlderRef.current) {
      el.scrollTop += el.scrollHeight - prevScrollHeightRef.current;
      loadingOlderRef.current = false;
    } else {
      el.scrollTop = el.scrollHeight;
      isNearBottomRef.current = true;
    }
  }, [persisted.length, open]);

  useEffect(() => {
    if (!draft) return;
    const el = scrollRef.current;
    if (!el || !isNearBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [draft]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  const send = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || isStreaming) return;
      setInput("");
      setErrorMessage(null);
      isNearBottomRef.current = true;
      assistantBufRef.current = "";

      const context: AskAIMessage[] = [
        ...persisted.slice(-CONTEXT_WINDOW).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: text },
      ];
      setDraft({ user: text, assistant: "" });

      try {
        await sendMessage(context, (token) => {
          assistantBufRef.current += token;
          setDraft((prev) => (prev ? { ...prev, assistant: prev.assistant + token } : prev));
        });

        const userMsg: AskAiHistoryMessage = {
          id: (tempIdRef.current -= 1),
          role: "user",
          content: text,
          createdAt: new Date().toISOString(),
        };
        const assistantMsg: AskAiHistoryMessage = {
          id: (tempIdRef.current -= 1),
          role: "assistant",
          content: assistantBufRef.current,
          createdAt: new Date().toISOString(),
        };

        qc.setQueryData<InfiniteData<AskAiHistoryPage>>(queryKeys.aiChat.history(), (old) => {
          if (!old || old.pages.length === 0) {
            return {
              pages: [{ messages: [assistantMsg, userMsg], nextCursor: null }],
              pageParams: [undefined],
            };
          }
          const pages = old.pages.map((page, index) =>
            index === 0
              ? { ...page, messages: [assistantMsg, userMsg, ...page.messages] }
              : page,
          );
          return { ...old, pages };
        });
        setDraft(null);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
        setDraft(null);
      }
    },
    [input, isStreaming, persisted, sendMessage, qc],
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void send();
  }

  function handleSuggestion(e: React.MouseEvent<HTMLButtonElement>) {
    void send(e.currentTarget.dataset.suggestion ?? "");
  }

  function handleToggle() {
    setOpen((prev) => !prev);
  }

  function handleClose() {
    setOpen(false);
  }

  function handleStop() {
    stop();
  }

  function handleClear() {
    if (isStreaming || clearHistory.isPending) return;
    clearHistory.mutate();
    setErrorMessage(null);
  }

  const showEmpty = !isLoading && persisted.length === 0 && !draft;
  const showClear = persisted.length > 0 || Boolean(draft);

  const panelTransition = reduce
    ? { duration: 0 }
    : { duration: 0.25, ease: "easeOut" as const };

  return (
    <div
      className={`fixed bottom-20 right-0 z-50 flex flex-col items-stretch md:bottom-0 ${open ? "w-[min(100vw,400px)]" : "w-[min(100vw,180px)]"}`}
      role="complementary"
      aria-label="Ask OS assistant"
    >
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="ask-os-panel"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={panelTransition}
            className="overflow-hidden"
          >
            <div className="flex h-[min(70dvh,560px)] flex-col overflow-hidden rounded-tl-2xl border border-b-0 border-border bg-card shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <AnimatedLogo size={32} gradient className="rounded-full" />
                  <div>
                    <p className="text-sm font-semibold leading-none text-foreground">Ask OS</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Your workspace assistant
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {showClear && (
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={isStreaming || clearHistory.isPending}
                      aria-label="Clear conversation"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close"
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto scrollbar-hide p-4"
              >
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : showEmpty ? (
                  <EmptyAskOs onSuggestion={handleSuggestion} />
                ) : (
                  <div className="space-y-4">
                    {hasNextPage && <div ref={topSentinelRef} className="h-px w-full" />}
                    {isFetchingNextPage && (
                      <div className="flex justify-center py-1">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {persisted.map((message) => (
                      <AskOsBubble
                        key={message.id}
                        role={message.role}
                        content={message.content}
                        streaming={false}
                        reduce={Boolean(reduce)}
                      />
                    ))}
                    {draft && (
                      <AskOsBubble
                        key="draft-user"
                        role="user"
                        content={draft.user}
                        streaming={false}
                        reduce={Boolean(reduce)}
                      />
                    )}
                    {draft && (
                      <AskOsBubble
                        key="draft-assistant"
                        role="assistant"
                        content={draft.assistant}
                        streaming={isStreaming}
                        reduce={Boolean(reduce)}
                      />
                    )}
                    {errorMessage && (
                      <p className="px-1 text-[11px] text-destructive">{errorMessage}</p>
                    )}
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex shrink-0 items-center gap-2 border-t border-border bg-background/60 p-3"
              >
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask anything about your workspace…"
                  disabled={isStreaming}
                  className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
                />
                {isStreaming ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 shrink-0 rounded-xl"
                    onClick={handleStop}
                    aria-label="Stop"
                  >
                    <Square className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl"
                    disabled={!input.trim()}
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={handleToggle}
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={panelTransition}
        whileTap={reduce ? undefined : { scale: 0.98 }}
        aria-expanded={open}
        aria-label={open ? "Minimize Ask OS assistant" : "Open Ask OS assistant"}
        className={`flex h-9 w-full items-center gap-2 bg-primary px-3 text-primary-foreground shadow-lg ring-1 ring-inset ring-blue-500/20 transition-colors hover:bg-primary/90 ${open ? "" : "rounded-tl-xl"}`}
      >
        <AnimatedLogo size={18} gradient />
        <span className="flex-1 text-left text-xs font-semibold tracking-wide">ASK OS</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-blue-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </motion.button>
    </div>
  );
}

function EmptyAskOs({
  onSuggestion,
}: {
  onSuggestion: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Bot className="h-6 w-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">How can I help?</p>
        <p className="mx-auto mt-1 max-w-[16rem] text-xs text-muted-foreground">
          I know your leads, projects, calendar, HR data and knowledge base — and I
          can take actions for you.
        </p>
      </div>
      <div className="w-full space-y-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            data-suggestion={s}
            onClick={onSuggestion}
            className="w-full rounded-lg bg-muted/60 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function AskOsBubble({
  role,
  content,
  streaming,
  reduce,
}: {
  role: "user" | "assistant";
  content: string;
  streaming: boolean;
  reduce: boolean;
}) {
  if (role === "user") {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm">
          {content}
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start gap-2"
    >
      <AnimatedLogo size={24} gradient className="mt-0.5 shrink-0 rounded-full" />
      <div className="min-w-0 max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm">
        {content ? (
          <div className="break-words">
            <MarkdownContent content={content} />
          </div>
        ) : streaming ? (
          <TypingDots reduce={reduce} />
        ) : null}
      </div>
    </motion.div>
  );
}

function TypingDots({ reduce }: { reduce: boolean }) {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
          animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}
