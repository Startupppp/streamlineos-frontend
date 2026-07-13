"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  PenLine,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { AnimatedLogo } from "@/features/landing/components/animated-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useAskAI,
  useAiConversations,
  useCreateAiConversation,
  useRenameAiConversation,
  useDeleteAiConversation,
  useAiConversationMessages,
  type AskAIMessage,
  type AskAiHistoryMessage,
  type AskAiHistoryPage,
} from "@/hooks/api";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useHydrated } from "@/hooks/common/use-hydrated";
import { AskOsConversationList } from "./ask-os-conversation-list";
import {
  AskOsBubble,
  buildMsgRows,
  DaySeparator,
  dayKey,
  EmptyAskOs,
} from "./ask-os-chat-utils";

const CONTEXT_WINDOW = 24;

interface Draft {
  user: string;
  assistant: string;
}

export function GlobalAskOs() {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [view, setView] = useState<"chat" | "conversations">("chat");
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null);
  const [convSearch, setConvSearch] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const loadingOlderRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const assistantBufRef = useRef("");
  const tempIdRef = useRef(0);

  const { sendMessage, stop, isStreaming } = useAskAI();
  const createConversation = useCreateAiConversation();
  const renameConversation = useRenameAiConversation();
  const deleteConversation = useDeleteAiConversation();

  const {
    data: convListData,
    hasNextPage: convHasNext,
    isFetchingNextPage: convFetchingNext,
    fetchNextPage: convFetchNext,
  } = useAiConversations(view === "conversations");
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAiConversationMessages(
      activeConversationId,
      open && activeConversationId !== null,
    );

  const conversations = useMemo(
    () => (convListData?.pages ?? []).flatMap((p) => p.conversations),
    [convListData],
  );
  const persisted = useMemo<AskAiHistoryMessage[]>(
    () =>
      (data?.pages ?? [])
        .flatMap((page) => page.messages)
        .slice()
        .reverse(),
    [data],
  );

  const loadOlder = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingOlderRef.current || !hasNextPage || isFetchingNextPage)
      return;
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
      setAtBottom(true);
    }
  }, [persisted.length, open]);

  useEffect(() => {
    if (!draft) return;
    const el = scrollRef.current;
    if (!el || !isNearBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [draft]);

  const send = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || isStreaming) return;
      setInput("");
      setErrorMessage(null);
      isNearBottomRef.current = true;
      assistantBufRef.current = "";

      let convId = activeConversationId;
      if (convId === null) {
        try {
          const conv = await createConversation.mutateAsync({
            title: text.substring(0, 60).trim(),
          });
          convId = conv.id;
          setActiveConversationId(conv.id);
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
          return;
        }
      }

      const context: AskAIMessage[] = [
        ...persisted
          .slice(-CONTEXT_WINDOW)
          .map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: text },
      ];
      setDraft({ user: text, assistant: "" });

      try {
        await sendMessage(
          context,
          (token) => {
            assistantBufRef.current += token;
            setDraft((prev) =>
              prev ? { ...prev, assistant: prev.assistant + token } : prev,
            );
          },
          convId,
        );

        const finalConvId = convId;
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
        qc.setQueryData<InfiniteData<AskAiHistoryPage>>(
          queryKeys.aiChat.conversationMessages(finalConvId),
          (old) => {
            if (!old || old.pages.length === 0) {
              return {
                pages: [
                  { messages: [assistantMsg, userMsg], nextCursor: null },
                ],
                pageParams: [undefined],
              };
            }
            return {
              ...old,
              pages: old.pages.map((p, i) =>
                i === 0
                  ? { ...p, messages: [assistantMsg, userMsg, ...p.messages] }
                  : p,
              ),
            };
          },
        );
        void qc.invalidateQueries({
          queryKey: queryKeys.aiChat.conversations(),
        });
        setDraft(null);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
        setDraft(null);
      }
    },
    [
      input,
      isStreaming,
      persisted,
      sendMessage,
      qc,
      activeConversationId,
      createConversation.mutateAsync,
    ],
  );

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    isNearBottomRef.current = near;
    setAtBottom((prev) => (prev === near ? prev : near));
  }

  function handleJumpToLatest() {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
    isNearBottomRef.current = true;
    setAtBottom(true);
  }

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
    setView("chat");
    setConvSearch("");
  }
  function handleOpenConversations() {
    setView("conversations");
    setConvSearch("");
  }
  function handleBackToChat() {
    setView("chat");
  }
  function handleNewChat() {
    setActiveConversationId(null);
    setView("chat");
  }
  function handleSelectConversation(id: number) {
    setActiveConversationId(id);
    setView("chat");
  }
  function handleStop() {
    stop();
  }

  function handleDeleteActive() {
    if (
      activeConversationId === null ||
      isStreaming ||
      deleteConversation.isPending
    )
      return;
    deleteConversation.mutate(activeConversationId);
    setActiveConversationId(null);
  }

  function handleRenameConversation(id: number, title: string) {
    renameConversation.mutate({ id, title });
  }

  function handleDeleteConversation(id: number) {
    deleteConversation.mutate(id);
    if (id === activeConversationId) {
      setActiveConversationId(null);
      setView("chat");
    }
  }

  function handleConvSearchChange(v: string) {
    setConvSearch(v);
  }

  function handleLoadMoreConversations() {
    void convFetchNext();
  }

  const isConversations = view === "conversations";
  const showEmpty = activeConversationId === null && !draft;
  const msgRows = useMemo(() => buildMsgRows(persisted), [persisted]);
  const lastPersisted =
    persisted.length > 0 ? persisted[persisted.length - 1] : undefined;
  const draftNeedsToday =
    Boolean(draft) &&
    (!lastPersisted ||
      dayKey(lastPersisted.createdAt) !== dayKey(new Date().toISOString()));
  const showJump = !atBottom && !isLoading && !showEmpty;
  const panelTransition = reduce
    ? { duration: 0 }
    : { duration: 0.25, ease: "easeOut" as const };
  const btnCls =
    "rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted";
  const anchorClassName = cn(
    "fixed right-0 bottom-[env(safe-area-inset-bottom,0px)] z-50 flex flex-col items-stretch",
    open ? "w-[min(100vw,400px)]" : "w-[min(100vw,130px)]",
  );

  if (!hydrated) return null;

  return createPortal(
    <div
      className={anchorClassName}
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
                {isConversations ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBackToChat}
                      aria-label="Back to chat"
                      className={btnCls}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <p className="text-sm font-semibold leading-none text-foreground">
                      Conversations
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AnimatedLogo size={32} gradient className="rounded-full" />
                    <div>
                      <p className="text-sm font-semibold leading-none text-foreground">
                        Ask OS
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Your workspace assistant
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {!isConversations && (
                    <>
                      <button
                        type="button"
                        onClick={handleOpenConversations}
                        aria-label="View conversations"
                        title="Conversations"
                        className={btnCls}
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                      {activeConversationId !== null && (
                        <button
                          type="button"
                          onClick={handleNewChat}
                          aria-label="New chat"
                          className={btnCls}
                        >
                          <PenLine className="h-4 w-4" />
                        </button>
                      )}
                      {activeConversationId !== null && (
                        <button
                          type="button"
                          onClick={handleDeleteActive}
                          disabled={isStreaming || deleteConversation.isPending}
                          aria-label="Delete conversation"
                          className={cn(btnCls, "disabled:opacity-50")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close"
                    className={btnCls}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {isConversations ? (
                <div className="flex-1 overflow-hidden">
                  <AskOsConversationList
                    conversations={conversations}
                    hasNextPage={convHasNext}
                    isFetchingNextPage={convFetchingNext}
                    onLoadMore={handleLoadMoreConversations}
                    onSelect={handleSelectConversation}
                    onNewChat={handleNewChat}
                    onRename={handleRenameConversation}
                    onDelete={handleDeleteConversation}
                    search={convSearch}
                    onSearchChange={handleConvSearchChange}
                    activeConversationId={activeConversationId}
                  />
                </div>
              ) : (
                <>
                  <div className="relative flex-1 overflow-hidden">
                    <div
                      ref={scrollRef}
                      onScroll={handleScroll}
                      className="absolute inset-0 overflow-y-auto scrollbar-hide p-4"
                    >
                      {isLoading ? (
                        <div className="flex h-full items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : showEmpty ? (
                        <EmptyAskOs onSuggestion={handleSuggestion} />
                      ) : (
                        <div className="space-y-4">
                          {hasNextPage ? (
                            <div
                              ref={topSentinelRef}
                              className="flex justify-center pb-1"
                            >
                              {isFetchingNextPage ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <button
                                  type="button"
                                  onClick={loadOlder}
                                  className="flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                  Load older messages
                                </button>
                              )}
                            </div>
                          ) : (
                            persisted.length > 0 && (
                              <p className="pb-1 text-center text-[10px] text-muted-foreground/60">
                                Beginning of conversation
                              </p>
                            )
                          )}
                          {msgRows.map((row) =>
                            row.type === "sep" ? (
                              <DaySeparator key={row.id} label={row.label} />
                            ) : (
                              <AskOsBubble
                                key={row.message.id}
                                role={row.message.role}
                                content={row.message.content}
                                streaming={false}
                                reduce={Boolean(reduce)}
                              />
                            ),
                          )}
                          {draftNeedsToday && (
                            <DaySeparator key="sep-draft-today" label="Today" />
                          )}
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
                            <p className="px-1 text-[11px] text-destructive">
                              {errorMessage}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <AnimatePresence>
                      {showJump && (
                        <motion.button
                          type="button"
                          onClick={handleJumpToLatest}
                          initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={reduce ? undefined : { opacity: 0, scale: 0.8 }}
                          aria-label="Jump to latest"
                          className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:bg-muted"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </motion.button>
                      )}
                    </AnimatePresence>
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
                </>
              )}
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
        aria-label={
          open ? "Minimize Ask OS assistant" : "Open Ask OS assistant"
        }
        className={`flex h-6 w-full items-center gap-1 bg-primary px-1.5 py-0 text-primary-foreground shadow-lg ring-1 ring-inset ring-primary/20 transition-colors hover:bg-primary/90 ${open ? "" : "rounded-tl-lg"}`}
      >
        <AnimatedLogo size={13} gradient />
        <span className="flex-1 text-left text-[9px] font-semibold leading-none tracking-wide">
          ASK OS
        </span>
        <ChevronDown
          className={`h-2.5 w-2.5 shrink-0 text-blue-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </motion.button>
    </div>,
    document.body,
  );
}
