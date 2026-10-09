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
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { XIcon } from "lucide-react";
import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import {
  useAskAI,
  useAiConversations,
  useCreateAiConversation,
  useRenameAiConversation,
  useDeleteAiConversation,
  useAiConversationMessages,
  useAskOsStarterSuggestions,
  type AskAIMessage,
  type AskAiHistoryMessage,
  type AskAiHistoryPage,
} from "@/hooks/api";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { cn } from "@/lib/utils";
import { useOrgStorageScope } from "@/lib/org-scoped-storage";
import { classifyAiError, type AiFailureState } from "@/components/ai";
import { useHydrated } from "@/hooks/common/use-hydrated";
import { useIsMobile } from "@/hooks/common/use-mobile";
import {
  askOsComposerRefusal,
  askOsPageContext,
  boundedAskOsContext,
  prepareAskOsSend,
  type PersonaId,
} from "./ask-os-request-policy";
import { AskOsChatComposer } from "./ask-os-chat-composer";
import { AskOsChatView } from "./ask-os-chat-view";
import { AskOsConversationList } from "./ask-os-conversation-list";
import { useAskOs } from "./ask-os-context";
import { AskOsPanelHeader } from "./ask-os-panel-header";
import { AskOsLauncher } from "./ask-os-launcher";
import {
  companionDisplayName,
  useCompanionPresence,
} from "./companion-launcher";
import type { AskOsClarificationAnswer } from "./ask-os-clarify-card";
import {
  AskOsCompanionStateContext,
  useAskOsPanelState,
} from "./ask-os-companion-state";
import {
  appendAskOsDirective,
  extractAskOsDirective,
  parseAskOsDirectivePayload,
  type AskOsDirective,
} from "./ask-os-directive-schema";
import { useSpeechInput, useSpeechPlayback } from "./use-browser-speech";
import { useCompanionRealtimeVoice } from "./use-companion-realtime-voice";
import { useCompanionVoiceSettings } from "./use-companion-voice-settings";

interface Draft {
  assistant: string;
  user: string;
}

export function GlobalAskOs() {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const { open, setOpen } = useAskOs();
  const queryClient = useQueryClient();
  const voiceScope = useOrgStorageScope();
  const companionVoiceSettings = useCompanionVoiceSettings(voiceScope);
  const companion = useCompanionPresence();

  const [input, setInput] = useState("");
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [failure, setFailure] = useState<AiFailureState | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [inFlightDirective, setInFlightDirective] = useState<AskOsDirective[]>(
    [],
  );
  const inFlightDirectiveRef = useRef<AskOsDirective[]>([]);
  const [atBottom, setAtBottom] = useState(true);
  const [view, setView] = useState<"chat" | "conversations">("chat");
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null);
  const [convSearch, setConvSearch] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<PersonaId | null>(
    null,
  );
  const [expanded, setExpanded] = useState(false);
  const speechPlayback = useSpeechPlayback(voiceScope);
  const speechInput = useSpeechInput({
    beforeStart: speechPlayback.stop,
    scopeKey: voiceScope,
  });
  const [contextDismissedForRoute, setContextDismissedForRoute] = useState<
    string | null
  >(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef(0);
  const loadingOlderRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const sendingRef = useRef(false);
  const lastSentRef = useRef<string | null>(null);
  const temporaryIdRef = useRef(0);
  const composerRef = useRef<HTMLInputElement>(null);
  const { sendMessage, stop, isStreaming } = useAskAI();
  const pageContext = useMemo(() => askOsPageContext(pathname), [pathname]);
  const contextEnabled = contextDismissedForRoute !== pathname;
  const contextLabel =
    pageContext.recordType && pageContext.recordId
      ? `${pageContext.recordType} ${pageContext.recordId}`
      : pageContext.module
        ? `${pageContext.module} page`
        : null;
  const createConversation = useCreateAiConversation();
  const renameConversation = useRenameAiConversation();
  const deleteConversation = useDeleteAiConversation();
  const {
    data: conversationData,
    hasNextPage: conversationHasNext,
    isFetchingNextPage: isFetchingNextConversations,
    fetchNextPage: fetchNextConversations,
  } = useAiConversations(open && view === "conversations");
  const {
    data: messageData,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useAiConversationMessages(
    activeConversationId,
    (open || voiceOverlayOpen) && activeConversationId !== null,
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
  const { data: starterSuggestionData } = useAskOsStarterSuggestions(
    open && showEmpty,
  );
  const threadBusy = isStreaming || draft !== null;
  const fillViewport = isMobile || expanded;
  const panelTransition = reduce
    ? { duration: 0 }
    : { duration: 0.25, ease: "easeOut" as const };
  const anchorClassName = cn(
    "fixed flex flex-col items-stretch",
    isMobile
      ? cn("inset-x-0 bottom-0 z-[60] w-full", !open && "pointer-events-none")
      : expanded
      ? cn("inset-0 z-[60] w-full", !open && "hidden")
      : cn(
          "right-0 bottom-[env(safe-area-inset-bottom,0px)] z-50",
          open ? "w-[min(100vw,400px)]" : "hidden w-[min(100vw,130px)] md:flex",
        ),
  );
  const panelMotionProps = fillViewport
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
    if (!fillViewport || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [fillViewport, open]);
  useEffect(() => {
    if (!open || !expanded || isMobile) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setExpanded(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [expanded, isMobile, open]);
  useEffect(() => {
    if (!open || view !== "chat" || threadBusy) return;
    const frame = window.requestAnimationFrame(() =>
      composerRef.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [open, threadBusy, view]);
  const handleDirectiveData = useCallback((name: string, data: unknown) => {
    if (name !== "askos-directive") return;
    const parsed = parseAskOsDirectivePayload(data);
    if (parsed === null) return;
    inFlightDirectiveRef.current = [...inFlightDirectiveRef.current, parsed];
    setInFlightDirective((previous) => [...previous, parsed]);
  }, []);

  const send = useCallback(
    async (
      override?: string,
      clarification?: { clarificationId: string; optionId: string },
    ) => {
      const prepared = prepareAskOsSend(override ?? input);
      if (prepared.status === "empty" || isStreaming || sendingRef.current)
        return;
      if (prepared.status === "invalid") {
        setInput(override ?? input);
        setComposerError(prepared.error);
        return;
      }
      const text = prepared.text;
      sendingRef.current = true;
      lastSentRef.current = text;
      setInput("");
      setComposerError(null);
      setFailure(null);
      inFlightDirectiveRef.current = [];
      setInFlightDirective([]);
      isNearBottomRef.current = true;
      setDraft({ user: text, assistant: "" });
      let conversationId = activeConversationId;
      if (conversationId === null) {
        try {
          const conversation = await createConversation.mutateAsync({
            title: text.substring(0, 60).trim(),
          });
          conversationId = conversation.id;
          queryClient.setQueryData<InfiniteData<AskAiHistoryPage>>(
            collaborationQueryKeys.aiChat.conversationMessages(conversation.id),
            {
              pages: [{ messages: [], nextCursor: null }],
              pageParams: [undefined],
            },
          );
          setActiveConversationId(conversation.id);
        } catch (error) {
          sendingRef.current = false;
          setDraft(null);
          const refusal = askOsComposerRefusal(error);
          if (refusal) {
            setInput(text);
            setComposerError(refusal);
            return;
          }
          setFailure(classifyAiError(error));
          return;
        }
      }
      const context = boundedAskOsContext<AskAIMessage>([
        ...persisted.map((message) => ({
          role: message.role,
          content: extractAskOsDirective(message.content).prose,
        })),
        { role: "user", content: text },
      ]);
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
          handleDirectiveData,
          { clarification, includePageContext: contextEnabled },
        );
        if (outcome.status === "busy") {
          setDraft(null);
          inFlightDirectiveRef.current = [];
          setInFlightDirective([]);
          return;
        }
        if (outcome.status === "cancelled" && outcome.text.length === 0) {
          setDraft(null);
          inFlightDirectiveRef.current = [];
          setInFlightDirective([]);
          setFailure({ status: "cancelled" });
          return;
        }
        if (outcome.status === "cancelled") setFailure({ status: "cancelled" });
        if (
          outcome.status === "completed" &&
          outcome.text.trim().length === 0 &&
          inFlightDirectiveRef.current.length === 0
        ) {
          setDraft(null);
          setFailure({
            status: "error",
            message:
              "The assistant returned nothing. Try rephrasing your question.",
          });
          return;
        }
        const userMessage: AskAiHistoryMessage = {
          id: (temporaryIdRef.current -= 1),
          role: "user",
          content: text,
          createdAt: new Date().toISOString(),
        };
        const assistantMessage: AskAiHistoryMessage = {
          id: (temporaryIdRef.current -= 1),
          role: "assistant",
          content: appendAskOsDirective(
            outcome.text,
            inFlightDirectiveRef.current,
          ),
          createdAt: new Date().toISOString(),
        };
        queryClient.setQueryData<InfiniteData<AskAiHistoryPage>>(
          collaborationQueryKeys.aiChat.conversationMessages(conversationId),
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
          queryKey: collaborationQueryKeys.aiChat.conversations(),
        });
        const requiresReview = outcome.status === "completed" && inFlightDirectiveRef.current.length > 0;
        setDraft(null);
        inFlightDirectiveRef.current = [];
        setInFlightDirective([]);
        return {
          text: outcome.status === "cancelled" ? "That request stopped before I could finish. Please ask again." : outcome.text,
          requiresReview,
        };
      } catch (error) {
        const refusal = askOsComposerRefusal(error);
        if (refusal) {
          setInput(text);
          setComposerError(refusal);
          setDraft(null);
        } else {
          setFailure(classifyAiError(error));
          setDraft(null);
        }
      } finally {
        sendingRef.current = false;
      }
    },
    [
      activeConversationId,
      contextEnabled,
      createConversation,
      handleDirectiveData,
      input,
      isStreaming,
      persisted,
      queryClient,
      selectedPersona,
      sendMessage,
    ],
  );
  const realtimeVoice = useCompanionRealtimeVoice(voiceScope, async (request) => {
    const result = await send(request);
    if (!result) return { text: "I could not complete that request. Please try again or open chat.", requiresReview: false };
    return {
      text: `${result.text.slice(0, 6000)}${result.requiresReview ? " An action is ready to review in chat. No change has been made yet." : ""}`,
      requiresReview: result.requiresReview,
    };
  }, companionVoiceSettings.settings);
  const panelState = useAskOsPanelState({
    draft,
    failure,
    directives: inFlightDirective,
    persisted,
  });
  function handleClarify(answer: AskOsClarificationAnswer) {
    speechInput.cancel();
    speechInput.reset();
    speechPlayback.stop();
    void send(answer.label, {
      clarificationId: answer.clarificationId,
      optionId: answer.optionId,
    });
  }
  const handleRetrySend = useCallback(() => {
    const last = lastSentRef.current;
    if (last) {
      speechInput.cancel();
      speechInput.reset();
      speechPlayback.stop();
      void send(last);
    }
  }, [send, speechInput, speechPlayback]);
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
    speechInput.reset();
    if (composerError) setComposerError(null);
  }
  function handleVoiceTranscript(transcript: string) {
    setInput((current) =>
      current.trim() ? `${current.trim()} ${transcript}` : transcript,
    );
    if (composerError) setComposerError(null);
  }
  function handleLauncherVoiceStart() {
    setOpen(false);
    setVoiceOverlayOpen(true);
    speechPlayback.stop();
    if (realtimeVoice.state === "listening" || realtimeVoice.state === "speaking" || realtimeVoice.state === "thinking" || realtimeVoice.state === "working" || realtimeVoice.state === "connecting") realtimeVoice.stop();
    else void realtimeVoice.start();
  }
  function handleVoiceDismiss() {
    realtimeVoice.stop();
    setVoiceOverlayOpen(false);
  }
  function handleVoiceReview() {
    realtimeVoice.stop();
    setVoiceOverlayOpen(false);
    setView("chat");
    setOpen(true);
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    speechInput.cancel();
    speechInput.reset();
    speechPlayback.stop();
    void send();
  }
  function handleSuggestion(event: MouseEvent<HTMLButtonElement>) {
    speechInput.cancel();
    speechInput.reset();
    speechPlayback.stop();
    void send(event.currentTarget.dataset.suggestion ?? "");
  }
  function handleClose() {
    speechInput.cancel();
    speechInput.reset();
    speechPlayback.stop();
    setOpen(false);
    setVoiceOverlayOpen(false);
    setView("chat");
    setConvSearch("");
  }
  function handleToggleExpanded() {
    setExpanded((previous) => !previous);
  }
  function handleBackToChat() {
    setView("chat");
  }
  function handleOpenConversations() {
    setView("conversations");
    setConvSearch("");
  }
  function handleNewChat() {
    speechInput.cancel();
    speechInput.reset();
    speechPlayback.stop();
    setActiveConversationId(null);
    setDraft(null);
    setFailure(null);
    setView("chat");
  }
  function handleSelectConversation(id: number) {
    speechInput.cancel();
    speechInput.reset();
    speechPlayback.stop();
    setActiveConversationId(id);
    setView("chat");
  }
  function handleRenameConversation(id: number, title: string) {
    renameConversation.mutate({ conversationId: id, title });
  }
  function handleDeleteActive() {
    if (
      activeConversationId === null ||
      threadBusy ||
      deleteConversation.isPending
    )
      return;
    deleteConversation.mutate(activeConversationId);
    speechInput.cancel();
    speechInput.reset();
    speechPlayback.stop();
    setActiveConversationId(null);
  }
  function handleDeleteConversation(id: number) {
    deleteConversation.mutate(id);
    if (id === activeConversationId) {
      speechInput.cancel();
      speechInput.reset();
      speechPlayback.stop();
      setActiveConversationId(null);
      setView("chat");
    }
  }
  if (!hydrated) return null;
  return createPortal(
    <div
      className={anchorClassName}
      role="complementary"
      aria-label={
        companion
          ? `StreamlineOS AI companion: ${companionDisplayName(companion)}`
          : "Ask OS assistant"
      }
    >
      <AskOsCompanionStateContext value={panelState}>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="ask-os-panel"
              {...panelMotionProps}
              transition={panelTransition}
              className={cn(
                "overflow-hidden",
                isMobile ? "pointer-events-auto flex h-[min(78dvh,640px)] min-h-0 w-full flex-col" : fillViewport && "flex h-full min-h-0 w-full flex-1 flex-col",
              )}
            >
              <div
                className={cn(
                  "flex flex-col overflow-hidden bg-card",
                  isMobile
                    ? "h-full min-h-0 w-full rounded-t-2xl border border-b-0 border-border pb-[env(safe-area-inset-bottom,0px)] shadow-2xl"
                    : fillViewport
                    ? "h-full min-h-0 w-full rounded-none border-0 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
                    : "h-[min(70dvh,560px)] rounded-tl-2xl border border-b-0 border-border shadow-2xl",
                )}
              >
                <AskOsPanelHeader
                  activeConversationId={activeConversationId}
                  deletePending={deleteConversation.isPending}
                  isConversations={isConversations}
                  isStreaming={threadBusy}
                  expanded={expanded}
                  showExpand={!isMobile}
                  onToggleExpanded={handleToggleExpanded}
                  onBackToChat={handleBackToChat}
                  onClose={handleClose}
                  onDeleteActive={handleDeleteActive}
                  onNewChat={handleNewChat}
                  onOpenConversations={handleOpenConversations}
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
                        suggestions={starterSuggestionData?.suggestions}
                        persisted={persisted}
                        reduce={Boolean(reduce)}
                        scrollRef={scrollRef}
                        showEmpty={showEmpty}
                        topSentinelRef={topSentinelRef}
                        directives={inFlightDirective}
                        onClarify={handleClarify}
                        speech={speechPlayback}
                      />
                      {contextEnabled && contextLabel ? (
                        <div className="flex items-center gap-1.5 border-t border-border/60 px-3 pt-2 text-xs text-muted-foreground">
                          <span
                            className="truncate rounded-full bg-muted px-2 py-1"
                            title={pageContext.route}
                          >
                            Context: {contextLabel}
                          </span>
                          <button
                            type="button"
                            aria-label="Remove page context"
                            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-muted hover:text-foreground"
                            onClick={() =>
                              setContextDismissedForRoute(pathname)
                            }
                          >
                            <XIcon className="size-3.5" aria-hidden />
                          </button>
                        </div>
                      ) : null}
                      <AskOsChatComposer
                        inputRef={composerRef}
                        error={composerError}
                        input={input}
                        isStreaming={threadBusy}
                        onInputChange={handleInputChange}
                        onVoiceTranscript={handleVoiceTranscript}
                        onSelectPersona={setSelectedPersona}
                        onStop={stop}
                        onSubmit={handleSubmit}
                        selectedPersona={selectedPersona}
                        speech={speechInput}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {(!open || (!isMobile && !expanded)) ? (
          <AskOsLauncher
            compact={isMobile}
            onVoiceStart={handleLauncherVoiceStart}
            onVoiceDismiss={handleVoiceDismiss}
            onVoiceReview={handleVoiceReview}
            voiceState={realtimeVoice.state}
            voiceSupported={realtimeVoice.supported}
            voiceMessage={realtimeVoice.message}
            voiceOverlayOpen={voiceOverlayOpen}
            voiceSettings={companionVoiceSettings.settings}
            onVoiceSettingsChange={companionVoiceSettings.update}
          />
        ) : null}
      </AskOsCompanionStateContext>
    </div>,
    document.body,
  );
}
