"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import { BookOpenTextIcon } from "@animateicons/react/lucide";
import { ChevronUp, Loader2, MessageSquare, Send } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { useKbAsk } from "@/hooks/api/kb/ask";
import { isAiStreamAbort } from "@/hooks/api/ai-text-stream";
import {
  useKbConversations,
  useRenameKbConversation,
  useDeleteKbConversation,
  useKbConversationMessages,
  type KbChatHistoryMessage,
  type KbChatHistoryPage,
} from "@/hooks/api/kb/chat-history";
import {
  useKbSources,
  useUploadKbSource,
  useDeleteKbSource,
} from "@/hooks/api/kb/sources";
import { pageHref } from "@/lib/knowledge-routes";
import { KbSourcesSheet } from "@/features/wiki/components/kb-sources-sheet";
import { KbNoteSheet } from "@/features/wiki/components/kb-note-sheet";
import { KbConversationList } from "@/features/wiki/components/kb-conversation-list";
import {
  ChatBubble,
  DaySeparator,
  EmptyChat,
  TypingBubble,
  buildKbHistoryRows,
  type ChatMessage,
} from "@/features/wiki/components/kb-chat-parts";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { getErrorMessage } from "@/lib/get-error-message";

interface Pending {
  question: string;
  answer?: string;
  error?: string;
}

export default function KnowledgeBasePage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const qc = useQueryClient();
  const pathname = usePathname();

  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [conversationsOpen, setConversationsOpen] = useState(false);
  const [conversationsSearch, setConversationsSearch] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const loadingOlderRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const tempIdRef = useRef(0);
  const generationRef = useRef(0);
  const initializedRef = useRef(false);

  const ask = useKbAsk();
  const conversationMessages = useKbConversationMessages(activeConversationId, true);
  const { hasNextPage, isFetchingNextPage, fetchNextPage, isLoading } = conversationMessages;

  const conversationsQuery = useKbConversations(conversationsOpen);
  const renameConversation = useRenameKbConversation();
  const deleteConversation = useDeleteKbConversation();

  const sourcesQuery = useKbSources();
  const uploadSource = useUploadKbSource();
  const deleteSource = useDeleteKbSource();

  const allConversations = useMemo(
    () => (conversationsQuery.data?.pages ?? []).flatMap((p) => p.conversations),
    [conversationsQuery.data],
  );

  const persisted = useMemo<ChatMessage[]>(
    () =>
      (conversationMessages.data?.pages ?? [])
        .flatMap((page) => page.messages)
        .slice()
        .reverse()
        .map((m) => ({
          id: String(m.id),
          role: m.role,
          content: m.content,
          citations: m.citations ?? undefined,
          createdAt: m.createdAt,
        })),
    [conversationMessages.data],
  );

  const rows = useMemo(() => buildKbHistoryRows(persisted), [persisted]);

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
    if (!sentinel || !root || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadOlder(); },
      { root, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, loadOlder]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (loadingOlderRef.current) {
      el.scrollTop += el.scrollHeight - prevScrollHeightRef.current;
      loadingOlderRef.current = false;
    } else {
      el.scrollTop = el.scrollHeight;
      isNearBottomRef.current = true;
    }
  }, [persisted.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isNearBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [pending, ask.isPending]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  const setConversation = useCallback(
    (id: number | null) => {
      setActiveConversationId(id);
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (id === null) params.delete("conversation");
      else params.set("conversation", String(id));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("conversation");
    if (!raw) return;
    const id = Number(raw);
    if (Number.isFinite(id) && id > 0) setActiveConversationId(id);
  }, []);

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || ask.isPending) return;
    setInput("");
    isNearBottomRef.current = true;
    setPending({ question: trimmed });
    const generation = ++generationRef.current;
    function handleToken(token: string) {
      if (generationRef.current === generation)
        setPending((current) => current ? { ...current, answer: (current.answer ?? "") + token } : current);
    }
    ask.mutate(
      { question: trimmed, conversationId: activeConversationId ?? undefined, onToken: handleToken },
      {
        onSuccess: (data) => {
          if (generationRef.current !== generation) return;
          const convId = activeConversationId ?? data.conversationId;
          const now = new Date().toISOString();
          const userMsg: KbChatHistoryMessage = { id: (tempIdRef.current -= 1), role: "user", content: trimmed, citations: null, createdAt: now };
          const assistantMsg: KbChatHistoryMessage = { id: (tempIdRef.current -= 1), role: "assistant", content: data.answer, citations: data.citations ?? null, createdAt: now };
          qc.setQueryData<InfiniteData<KbChatHistoryPage>>(knowledgeAndSurveysQueryKeys.kb.chatConversationMessages(convId), (old) => {
            if (!old || old.pages.length === 0) {
              return { pages: [{ messages: [assistantMsg, userMsg], nextCursor: null }], pageParams: [undefined] };
            }
            return { ...old, pages: old.pages.map((page, i) => i === 0 ? { ...page, messages: [assistantMsg, userMsg, ...page.messages] } : page) };
          });
          if (activeConversationId === null) setConversation(data.conversationId);
          void qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.chatConversations() });
          setPending(null);
        },
        onError: (error) => {
          if (generationRef.current !== generation) return;
          if (isAiStreamAbort(error)) {
            setPending((current) => current ? { ...current, error: "Generation stopped. This answer is incomplete." } : current);
            return;
          }
          const message = getErrorMessage(error);
          setPending((prev) => (prev ? { ...prev, error: message } : prev));
          toast.error("Couldn't get an answer", { description: message });
        },
      },
    );
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) { setInput(e.target.value); }
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) { if (e.key === "Enter") { e.preventDefault(); sendMessage(input); } }
  function handleSend() { sendMessage(input); }
  function handleSuggestion(e: React.MouseEvent<HTMLButtonElement>) { sendMessage(e.currentTarget.dataset.suggestion ?? ""); }
  function handleCitationClick(e: React.MouseEvent<HTMLButtonElement>) {
    const pageId = Number(e.currentTarget.dataset.pageId);
    if (pageId) router.push(pageHref(pageId));
  }

  function handleToggleConversations() {
    setConversationsOpen((prev) => { if (prev) setConversationsSearch(""); return !prev; });
  }
  function handleConversationsSearchChange(v: string) { setConversationsSearch(v); }
  function handleStop() { ask.stop(); }
  function handleRegenerate() {
    if (!pending || ask.isPending) return;
    ask.resetAttempt();
    sendMessage(pending.question);
  }
  function handleSelectConversation(id: number) { generationRef.current += 1; ask.stop(); setPending(null); setConversation(id); setConversationsOpen(false); }
  function handleNewChat() { generationRef.current += 1; ask.stop(); setConversation(null); setConversationsOpen(false); setPending(null); }
  function handleLoadMoreConversations() { void conversationsQuery.fetchNextPage(); }

  function handleDeleteConversation(id: number) {
    deleteConversation.mutate(id, {
      onSuccess: () => {
        if (id === activeConversationId) setConversation(null);
        void qc.invalidateQueries({ queryKey: knowledgeAndSurveysQueryKeys.kb.chatConversations() });
      },
      onError: (error) => toast.error("Couldn't delete conversation", { description: getErrorMessage(error) }),
    });
  }

  function handleRenameConversation(id: number, title: string) {
    renameConversation.mutate({ id, title });
  }

  function handleUploadClick() { fileInputRef.current?.click(); }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    uploadSource.mutate(file, {
      onSuccess: () => toast.success("File uploaded and queued for processing"),
      onError: (error) => toast.error("Upload failed", { description: getErrorMessage(error) }),
    });
  }
  function handleSourcesClick() { setSourcesSheetOpen(true); }
  function handleAddNoteClick() { setSourcesSheetOpen(false); setNoteOpen(true); }

  function makeDeleteHandler(id: number) {
    return function handleDeleteSource() {
      deleteSource.mutate(id, {
        onSuccess: () => toast.success("Source removed"),
        onError: (error) => toast.error("Delete failed", { description: getErrorMessage(error) }),
      });
    };
  }

  const sources = (sourcesQuery.data?.pages ?? []).flatMap((page) => page.data);
  const readyCount = sources.filter((s) => s.status === "ready").length;

  return (
    <PageWrapper
      title="Knowledge Base"
      subtitle="Chat with your files, notes and wiki — answers are grounded in your content."
      noInternalScroll
      contentClassName="flex flex-col min-h-0 px-4 sm:px-6"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleToggleConversations} aria-pressed={conversationsOpen}>
            <MessageSquare className="h-4 w-4" />
            Conversations
          </Button>
          <LoadingButton variant="outline" size="sm" className="gap-1.5" isPending={uploadSource.isPending} onClick={handleSourcesClick}>
            {!uploadSource.isPending && <BookOpenTextIcon size={16} />}
            Sources
          </LoadingButton>
        </div>
      }
    >
      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md,.csv" className="hidden" onChange={handleFileChange} />

      <div className="flex w-full flex-1 min-h-0 flex-col">
        <div className="flex w-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {conversationsOpen ? (
            <KbConversationList
              conversations={allConversations}
              hasNextPage={conversationsQuery.hasNextPage}
              isFetchingNextPage={conversationsQuery.isFetchingNextPage}
              onLoadMore={handleLoadMoreConversations}
              onSelect={handleSelectConversation}
              onNewChat={handleNewChat}
              onRename={handleRenameConversation}
              onDelete={handleDeleteConversation}
              onClose={handleToggleConversations}
              search={conversationsSearch}
              onSearchChange={handleConversationsSearchChange}
              activeConversationId={activeConversationId}
            />
          ) : (
            <>
              <ScrollArea
                hideScrollbar
                className="flex-1 min-h-0"
                viewportRef={scrollRef}
                onViewportScroll={handleScroll}
              >
                <div className="overscroll-contain space-y-4 p-4">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : rows.length === 0 && !pending ? (
                  <EmptyChat onSuggestion={handleSuggestion} />
                ) : (
                  <>
                    {hasNextPage ? (
                      <div ref={topSentinelRef} className="flex justify-center pb-1">
                        {isFetchingNextPage ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <button type="button" onClick={loadOlder} className="flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-dense font-medium text-muted-foreground transition-colors hover:bg-muted">
                            <ChevronUp className="h-3 w-3" />Load older messages
                          </button>
                        )}
                      </div>
                    ) : (
                      persisted.length > 0 && (
                        <p className="pb-1 text-center text-micro text-muted-foreground">Beginning of your conversation</p>
                      )
                    )}
                    {rows.map((row) =>
                      row.type === "sep" ? (
                        <DaySeparator key={row.id} label={row.label} />
                      ) : (
                        <ChatBubble key={row.message.id} message={row.message} onCitation={handleCitationClick} reduce={Boolean(reduce)} />
                      ),
                    )}
                    {pending && (
                      <ChatBubble key="pending-user" message={{ id: "pending-user", role: "user", content: pending.question }} onCitation={handleCitationClick} reduce={Boolean(reduce)} />
                    )}
                    {pending?.error && (
                      <ChatBubble key="pending-error" message={{ id: "pending-error", role: "assistant", content: pending.error, isError: true }} onCitation={handleCitationClick} reduce={Boolean(reduce)} />
                    )}
                    {pending?.error && !ask.isPending && <Button variant="outline" onClick={handleRegenerate}>Generate a new answer</Button>}
                    {pending?.answer && <ChatBubble message={{ id: "pending-answer", role: "assistant", content: pending.answer }} onCitation={handleCitationClick} reduce={Boolean(reduce)} />}
                    {ask.isPending && !pending?.answer && <TypingBubble reduce={Boolean(reduce)} />}
                  </>
                )}
                </div>
              </ScrollArea>

              <div className="shrink-0 border-t border-border bg-background/60 p-3">
                <div className="flex items-center gap-2">
                  <Input value={input} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Ask anything about your files, notes and wiki…" className="h-11 rounded-xl text-sm" autoFocus />
                  {ask.isPending && <Button variant="outline" onClick={handleStop}>Stop</Button>}
                  <Button onClick={handleSend} disabled={ask.isPending || !input.trim()} className="h-11 w-11 shrink-0 rounded-xl p-0" aria-label="Send">
                    <motion.span whileTap={reduce ? undefined : { scale: 0.85 }}>
                      <Send className="h-4 w-4" />
                    </motion.span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <KbSourcesSheet
        open={sourcesSheetOpen}
        onOpenChange={setSourcesSheetOpen}
        sources={sources}
        isLoading={sourcesQuery.isLoading}
        readyCount={readyCount}
        onUploadClick={handleUploadClick}
        uploadPending={uploadSource.isPending}
        onAddNoteClick={handleAddNoteClick}
        makeDeleteHandler={makeDeleteHandler}
        deletingId={deleteSource.variables}
        isDeleting={deleteSource.isPending}
      />

      <KbNoteSheet open={noteOpen} onOpenChange={setNoteOpen} />
    </PageWrapper>
  );
}
