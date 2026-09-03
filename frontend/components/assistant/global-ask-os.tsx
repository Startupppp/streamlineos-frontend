"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import { AnimatedLogo } from "@/components/brand/animated-logo";
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
import { cn } from "@/lib/utils";
import { classifyAiError, type AiFailureState } from "@/components/ai";
import { useHydrated } from "@/hooks/common/use-hydrated";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { type PersonaId } from "@/features/ai-summaries/components/persona-chip-strip";
import { AskOsChatComposer } from "./ask-os-chat-composer";
import { AskOsChatView } from "./ask-os-chat-view";
import { AskOsConversationList } from "./ask-os-conversation-list";
import { useAskOs } from "./ask-os-context";
import { AskOsPanelHeader } from "./ask-os-panel-header";

const CONTEXT_WINDOW = 24;
interface Draft {
  assistant: string;
  user: string;
}

export function GlobalAskOs() {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const isMobile = useIsMobile();
  const { open, setOpen, toggle } = useAskOs();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [failure, setFailure] = useState<AiFailureState | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [view, setView] = useState<"chat" | "conversations">("chat");
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null);
  const [convSearch, setConvSearch] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<PersonaId | null>(
    null,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef(0);
  const loadingOlderRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const sendingRef = useRef(false);
  const lastSentRef = useRef<string | null>(null);
  const temporaryIdRef = useRef(0);
  const { sendMessage, stop, isStreaming } = useAskAI();
  const createConversation = useCreateAiConversation();
  const renameConversation = useRenameAiConversation();
  const deleteConversation = useDeleteAiConversation();
  const {
    data: conversationData,
    hasNextPage: conversationHasNext,
    isFetchingNextPage: isFetchingNextConversations,
    fetchNextPage: fetchNextConversations,
  } = useAiConversations(view === "conversations");
  const {
    data: messageData,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useAiConversationMessages(
    activeConversationId,
    open && activeConversationId !== null,
  );
  const conversations = useMemo(
    () => (conversationData?.pages ?? []).flatMap((page) => page.conversations),
    [conversationData],
  );
  const persisted = useMemo<AskAiHistoryMessage[]>(
    () =>
      (messageData?.pages ?? [])
        .flatMap((page) => page.messages)
        .slice()
        .reverse(),
    [messageData],
  );
  const isConversations = view === "conversations";
  const showEmpty = activeConversationId === null && !draft;
  const panelTransition = reduce
    ? { duration: 0 }
    : { duration: 0.25, ease: "easeOut" as const };
  const anchorClassName = cn(
    "fixed flex flex-col items-stretch",
    isMobile
      ? cn("inset-0 z-[60] w-full", !open && "hidden")
      : cn(
          "right-0 bottom-[env(safe-area-inset-bottom,0px)] z-50",
          open ? "w-[min(100vw,400px)]" : "hidden w-[min(100vw,130px)] md:flex",
        ),
  );
  const panelMotionProps = isMobile
    ? {
        initial: reduce ? false : { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        exit: reduce ? undefined : { opacity: 0, y: 24 },
      }
    : {
        initial: reduce ? false : { height: 0, opacity: 0 },
        animate: { height: "auto" as const, opacity: 1 },
        exit: reduce ? undefined : { height: 0, opacity: 0 },
      };
  const loadOlder = useCallback(() => {
    const element = scrollRef.current;
    if (
      !element ||
      loadingOlderRef.current ||
      !hasNextPage ||
      isFetchingNextPage
    )
      return;
    previousScrollHeightRef.current = element.scrollHeight;
    loadingOlderRef.current = true;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
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
  }, [hasNextPage, loadOlder, open]);
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element || !open) return;
    if (loadingOlderRef.current) {
      element.scrollTop +=
        element.scrollHeight - previousScrollHeightRef.current;
      loadingOlderRef.current = false;
      return;
    }
    element.scrollTop = element.scrollHeight;
    isNearBottomRef.current = true;
    setAtBottom(true);
  }, [open, persisted.length]);
  useEffect(() => {
    const element = scrollRef.current;
    if (!draft || !element || !isNearBottomRef.current) return;
    element.scrollTop = element.scrollHeight;
  }, [draft]);
  useEffect(() => {
    if (!isMobile || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, open]);
  const send = useCallback(
    async (override?: string) => {
      const text = (override ?? input).trim();
      if (!text || isStreaming || sendingRef.current) return;
      sendingRef.current = true;
      lastSentRef.current = text;
      setInput("");
      setFailure(null);
      isNearBottomRef.current = true;
      let conversationId = activeConversationId;
      if (conversationId === null) {
        try {
          const conversation = await createConversation.mutateAsync({
            title: text.substring(0, 60).trim(),
          });
          conversationId = conversation.id;
          setActiveConversationId(conversation.id);
        } catch (error) {
          sendingRef.current = false;
          setFailure(classifyAiError(error));
          return;
        }
      }
      const context: AskAIMessage[] = [
        ...persisted
          .slice(-CONTEXT_WINDOW)
          .map((message) => ({ role: message.role, content: message.content })),
        { role: "user", content: text },
      ];
      setDraft({ user: text, assistant: "" });
      try {
        const outcome = await sendMessage(
          context,
          (token) => {
            setDraft((previous) =>
              previous
                ? { ...previous, assistant: previous.assistant + token }
                : previous,
            );
          },
          conversationId,
          selectedPersona ?? undefined,
        );
        if (outcome.status === "busy") {
          setDraft(null);
          return;
        }
        if (outcome.status === "cancelled" && outcome.text.length === 0) {
          setDraft(null);
          setFailure({ status: "cancelled" });
          return;
        }
        if (outcome.status === "cancelled") setFailure({ status: "cancelled" });
        const userMessage: AskAiHistoryMessage = {
          id: (temporaryIdRef.current -= 1),
          role: "user",
          content: text,
          createdAt: new Date().toISOString(),
        };
        const assistantMessage: AskAiHistoryMessage = {
          id: (temporaryIdRef.current -= 1),
          role: "assistant",
          content: outcome.text,
          createdAt: new Date().toISOString(),
        };
        queryClient.setQueryData<InfiniteData<AskAiHistoryPage>>(
          queryKeys.aiChat.conversationMessages(conversationId),
          (previous) => {
            if (!previous || previous.pages.length === 0)
              return {
                pages: [
                  {
                    messages: [assistantMessage, userMessage],
                    nextCursor: null,
                  },
                ],
                pageParams: [undefined],
              };
            return {
              ...previous,
              pages: previous.pages.map((page, index) =>
                index === 0
                  ? {
                      ...page,
                      messages: [
                        assistantMessage,
                        userMessage,
                        ...page.messages,
                      ],
                    }
                  : page,
              ),
            };
          },
        );
        void queryClient.invalidateQueries({
          queryKey: queryKeys.aiChat.conversations(),
        });
        setDraft(null);
      } catch (error) {
        setFailure(classifyAiError(error));
        setDraft(null);
      } finally {
        sendingRef.current = false;
      }
    },
    [
      activeConversationId,
      createConversation,
      input,
      isStreaming,
      persisted,
      queryClient,
      selectedPersona,
      sendMessage,
    ],
  );
  const handleRetrySend = useCallback(() => {
    const last = lastSentRef.current;
    if (last) void send(last);
  }, [send]);
  function handleScroll() {
    const element = scrollRef.current;
    if (!element) return;
    const nearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 120;
    isNearBottomRef.current = nearBottom;
    setAtBottom((previous) =>
      previous === nearBottom ? previous : nearBottom,
    );
  }
  function handleJumpToLatest() {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({
      top: element.scrollHeight,
      behavior: reduce ? "auto" : "smooth",
    });
    isNearBottomRef.current = true;
    setAtBottom(true);
  }
  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    setInput(event.target.value);
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send();
  }
  function handleSuggestion(event: MouseEvent<HTMLButtonElement>) {
    void send(event.currentTarget.dataset.suggestion ?? "");
  }
  function handleClose() {
    setOpen(false);
    setView("chat");
    setConvSearch("");
  }
  function handleNewChat() {
    setActiveConversationId(null);
    setView("chat");
  }
  function handleSelectConversation(id: number) {
    setActiveConversationId(id);
    setView("chat");
  }
  function handleRenameConversation(id: number, title: string) {
    renameConversation.mutate({ id, title });
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
  function handleDeleteConversation(id: number) {
    deleteConversation.mutate(id);
    if (id === activeConversationId) {
      setActiveConversationId(null);
      setView("chat");
    }
  }
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
            {...panelMotionProps}
            transition={panelTransition}
            className={cn(
              "overflow-hidden",
              isMobile && "flex h-full min-h-0 w-full flex-1 flex-col",
            )}
          >
            <div
              className={cn(
                "flex flex-col overflow-hidden bg-card",
                isMobile
                  ? "h-full min-h-0 w-full rounded-none border-0 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
                  : "h-[min(70dvh,560px)] rounded-tl-2xl border border-b-0 border-border shadow-2xl",
              )}
            >
              <AskOsPanelHeader
                activeConversationId={activeConversationId}
                deletePending={deleteConversation.isPending}
                isConversations={isConversations}
                isStreaming={isStreaming}
                onBackToChat={() => setView("chat")}
                onClose={handleClose}
                onDeleteActive={handleDeleteActive}
                onNewChat={handleNewChat}
                onOpenConversations={() => {
                  setView("conversations");
                  setConvSearch("");
                }}
              />
              <AnimatePresence initial={false} mode="wait">
                {isConversations ? (
                  <motion.div
                    key="conversations"
                    initial={reduce ? false : { opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduce ? undefined : { opacity: 0, x: -24 }}
                    transition={panelTransition}
                    className="min-h-0 flex-1 overflow-hidden"
                  >
                    <AskOsConversationList
                      conversations={conversations}
                      hasNextPage={conversationHasNext}
                      isFetchingNextPage={isFetchingNextConversations}
                      onLoadMore={() => void fetchNextConversations()}
                      onSelect={handleSelectConversation}
                      onNewChat={handleNewChat}
                      onRename={handleRenameConversation}
                      onDelete={handleDeleteConversation}
                      search={convSearch}
                      onSearchChange={setConvSearch}
                      activeConversationId={activeConversationId}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="chat"
                    initial={reduce ? false : { opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduce ? undefined : { opacity: 0, x: -24 }}
                    transition={panelTransition}
                    className="flex min-h-0 flex-1 flex-col"
                  >
                    <AskOsChatView
                      atBottom={atBottom}
                      draft={draft}
                      failure={failure}
                      onRetry={handleRetrySend}
                      hasNextPage={hasNextPage}
                      isFetchingNextPage={isFetchingNextPage}
                      isLoading={isLoading}
                      isStreaming={isStreaming}
                      onJumpToLatest={handleJumpToLatest}
                      onLoadOlder={loadOlder}
                      onScroll={handleScroll}
                      onSuggestion={handleSuggestion}
                      persisted={persisted}
                      reduce={Boolean(reduce)}
                      scrollRef={scrollRef}
                      showEmpty={showEmpty}
                      topSentinelRef={topSentinelRef}
                    />
                    <AskOsChatComposer
                      input={input}
                      isStreaming={isStreaming}
                      onInputChange={handleInputChange}
                      onSelectPersona={setSelectedPersona}
                      onStop={stop}
                      onSubmit={handleSubmit}
                      selectedPersona={selectedPersona}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        onClick={toggle}
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={panelTransition}
        whileTap={reduce ? undefined : { scale: 0.98 }}
        aria-expanded={open}
        aria-label={
          open ? "Minimize Ask OS assistant" : "Open Ask OS assistant"
        }
        className={`hidden md:flex h-6 w-full items-center gap-1 bg-primary px-1.5 py-0 text-primary-foreground shadow-lg ring-1 ring-inset ring-primary/20 transition-colors hover:bg-primary/90 ${open ? "" : "rounded-tl-lg"}`}
      >
        <AnimatedLogo size={13} gradient />
        <span className="flex-1 text-left text-micro font-semibold leading-none tracking-wide">
          ASK OS
        </span>
        <ChevronDown
          className={`h-2.5 w-2.5 shrink-0 text-primary-foreground/70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </motion.button>
    </div>,
    document.body,
  );
}
