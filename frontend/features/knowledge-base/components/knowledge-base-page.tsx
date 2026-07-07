"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import { BookOpenTextIcon } from "@animateicons/react/lucide";
import { ChevronUp, Clock, Loader2, Search, Send, Trash2, X } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useKbAsk } from "@/hooks/api/kb/ask";
import {
  useKbChatHistory,
  useClearKbChatHistory,
  type KbChatHistoryMessage,
  type KbChatHistoryPage,
} from "@/hooks/api/kb/chat-history";
import {
  useKbSources,
  useUploadKbSource,
  useDeleteKbSource,
} from "@/hooks/api/kb/sources";
import { pageHref } from "@/features/knowledge-base/lib/knowledge-routes";
import { KbSourcesSheet } from "@/features/knowledge-base/components/kb-sources-sheet";
import { KbNoteSheet } from "@/features/knowledge-base/components/kb-note-sheet";
import {
  ChatBubble,
  DaySeparator,
  EmptyChat,
  TypingBubble,
  buildKbHistoryRows,
  type ChatMessage,
} from "@/features/knowledge-base/components/kb-chat-parts";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/api-client";

interface Pending {
  question: string;
  error?: string;
}

export default function KnowledgeBasePage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const qc = useQueryClient();

  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");

  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const loadingOlderRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const tempIdRef = useRef(0);

  const ask = useKbAsk();
  const clearHistory = useClearKbChatHistory();
  const history = useKbChatHistory(true);
  const { hasNextPage, isFetchingNextPage, fetchNextPage, isLoading } = history;

  const sourcesQuery = useKbSources();
  const uploadSource = useUploadKbSource();
  const deleteSource = useDeleteKbSource();

  const persisted = useMemo<ChatMessage[]>(
    () =>
      (history.data?.pages ?? [])
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
    [history.data],
  );

  const searchActive = historyOpen && historyQuery.trim().length > 0;
  const rows = useMemo(() => {
    const q = historyOpen ? historyQuery.trim().toLowerCase() : "";
    const list = q ? persisted.filter((m) => m.content.toLowerCase().includes(q)) : persisted;
    return buildKbHistoryRows(list);
  }, [persisted, historyOpen, historyQuery]);

  const isEmpty = !isLoading && persisted.length === 0 && !pending;

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
      (entries) => {
        if (entries[0]?.isIntersecting) loadOlder();
      },
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

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || ask.isPending) return;
    setInput("");
    isNearBottomRef.current = true;
    setPending({ question: trimmed });
    ask.mutate(
      { question: trimmed },
      {
        onSuccess: (data) => {
          const now = new Date().toISOString();
          const userMsg: KbChatHistoryMessage = {
            id: (tempIdRef.current -= 1),
            role: "user",
            content: trimmed,
            citations: null,
            createdAt: now,
          };
          const assistantMsg: KbChatHistoryMessage = {
            id: (tempIdRef.current -= 1),
            role: "assistant",
            content: data.answer,
            citations: data.citations ?? null,
            createdAt: now,
          };
          qc.setQueryData<InfiniteData<KbChatHistoryPage>>(queryKeys.kb.chatHistory(), (old) => {
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
          setPending(null);
        },
        onError: (error) => {
          const message = getErrorMessage(error);
          setPending((prev) => (prev ? { ...prev, error: message } : prev));
          toast.error("Couldn't get an answer", { description: message });
        },
      },
    );
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleSend() {
    sendMessage(input);
  }

  function handleSuggestion(e: React.MouseEvent<HTMLButtonElement>) {
    sendMessage(e.currentTarget.dataset.suggestion ?? "");
  }

  function handleCitationClick(e: React.MouseEvent<HTMLButtonElement>) {
    const pageId = Number(e.currentTarget.dataset.pageId);
    if (pageId) router.push(pageHref(pageId));
  }

  function handleToggleHistory() {
    setHistoryOpen((prev) => {
      if (prev) setHistoryQuery("");
      return !prev;
    });
  }

  function handleHistoryQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setHistoryQuery(e.target.value);
  }

  function handleClearChat() {
    if (clearHistory.isPending) return;
    clearHistory.mutate();
    setPending(null);
    setHistoryOpen(false);
    setHistoryQuery("");
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    uploadSource.mutate(file, {
      onSuccess: () => toast.success("File uploaded and queued for processing"),
      onError: (error) => toast.error("Upload failed", { description: getErrorMessage(error) }),
    });
  }

  function handleSourcesClick() {
    setSourcesSheetOpen(true);
  }

  function handleAddNoteClick() {
    setSourcesSheetOpen(false);
    setNoteOpen(true);
  }

  function makeDeleteHandler(id: number) {
    return function handleDeleteSource() {
      deleteSource.mutate(id, {
        onSuccess: () => toast.success("Source removed"),
        onError: (error) => toast.error("Delete failed", { description: getErrorMessage(error) }),
      });
    };
  }

  const sources = sourcesQuery.data ?? [];
  const readyCount = sources.filter((s) => s.status === "ready").length;

  return (
    <PageWrapper
      eyebrow="Knowledge Base"
      title="Knowledge Base"
      subtitle="Chat with your files, notes and wiki — answers are grounded in your content."
      noInternalScroll
      contentClassName="flex flex-col min-h-0 px-4 sm:px-6"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleToggleHistory}
            aria-pressed={historyOpen}
          >
            <Clock className="h-4 w-4" />
            History
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleSourcesClick}>
            {uploadSource.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BookOpenTextIcon size={16} />
            )}
            Sources
          </Button>
        </div>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex w-full flex-1 min-h-0 flex-col">
        <div className="flex w-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {historyOpen && (
            <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-background px-2.5">
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  value={historyQuery}
                  onChange={handleHistoryQueryChange}
                  placeholder="Search your history…"
                  className="h-8 flex-1 bg-transparent text-xs focus-visible:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleClearChat}
                disabled={clearHistory.isPending}
                aria-label="Clear conversation"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleToggleHistory}
                aria-label="Close history search"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 space-y-4 overflow-y-auto scrollbar-hide p-4"
          >
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : historyOpen && persisted.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <p className="text-sm font-medium text-foreground">No history yet</p>
                <p className="text-xs text-muted-foreground">
                  Ask a question and your conversation will be saved here.
                </p>
              </div>
            ) : isEmpty ? (
              <EmptyChat onSuggestion={handleSuggestion} />
            ) : searchActive && rows.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <p className="text-sm font-medium text-foreground">No matches</p>
                <p className="text-xs text-muted-foreground">Try a different search term.</p>
              </div>
            ) : (
              <>
                {hasNextPage ? (
                  <div ref={topSentinelRef} className="flex justify-center pb-1">
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
                      Beginning of your conversation
                    </p>
                  )
                )}
                {rows.map((row) =>
                  row.type === "sep" ? (
                    <DaySeparator key={row.id} label={row.label} />
                  ) : (
                    <ChatBubble
                      key={row.message.id}
                      message={row.message}
                      onCitation={handleCitationClick}
                      reduce={Boolean(reduce)}
                    />
                  ),
                )}
                {!searchActive && pending && (
                  <ChatBubble
                    key="pending-user"
                    message={{ id: "pending-user", role: "user", content: pending.question }}
                    onCitation={handleCitationClick}
                    reduce={Boolean(reduce)}
                  />
                )}
                {!searchActive && pending?.error && (
                  <ChatBubble
                    key="pending-error"
                    message={{
                      id: "pending-error",
                      role: "assistant",
                      content: pending.error,
                      isError: true,
                    }}
                    onCitation={handleCitationClick}
                    reduce={Boolean(reduce)}
                  />
                )}
                {!searchActive && ask.isPending && <TypingBubble reduce={Boolean(reduce)} />}
              </>
            )}
          </div>

          <div className="shrink-0 border-t border-border bg-background/60 p-3">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your files, notes and wiki…"
                className="h-11 rounded-xl text-sm"
                autoFocus
              />
              <Button
                onClick={handleSend}
                disabled={ask.isPending || !input.trim()}
                className="h-11 w-11 shrink-0 rounded-xl p-0"
                aria-label="Send"
              >
                <motion.span whileTap={reduce ? undefined : { scale: 0.85 }}>
                  <Send className="h-4 w-4" />
                </motion.span>
              </Button>
            </div>
          </div>
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
