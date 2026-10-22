"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpenTextIcon } from "@animateicons/react/lucide";
import { ChevronUp, Loader2, MessageSquare, Send, SlidersHorizontal } from "lucide-react";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  useKbConversations,
  useRenameKbConversation,
  useDeleteKbConversation,
  useKbConversationMessages,
} from "@/hooks/api/kb/chat-history";
import { useInfiniteKbPageCollection } from "@/hooks/api/kb/page-collection";
import { useDeleteKbPage } from "@/hooks/api/kb/pages";
import { useUploadKbFile } from "@/hooks/api/kb/files";
import { companyDocumentHref, pageHref } from "@/lib/knowledge-routes";
import { KbSourcesSheet } from "@/features/wiki/components/kb-sources-sheet";
import { KbNoteSheet } from "@/features/wiki/components/kb-note-sheet";
import { KbConversationList } from "@/features/wiki/components/kb-conversation-list";
import {
  ChatBubble,
  TypingBubble,
  type ChatMessage,
} from "@/components/kb/kb-chat-bubble";
import {
  DaySeparator,
  EmptyChat,
  InsufficientEvidenceBanner,
  OverQuotaBanner,
  DisagreementBanner,
  CopyAnswerButton,
  AnswerFeedbackBar,
  CitationEvidenceList,
  buildKbHistoryRows,
  questionForAssistantId,
} from "@/features/wiki/components/kb-chat-parts";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { getErrorMessage } from "@/lib/get-error-message";
import { useKbScopeFilter } from "@/features/wiki/hooks/use-kb-scope-filter";
import { useKbChatScroll } from "@/features/wiki/hooks/use-kb-chat-scroll";
import { useKbChatPending } from "@/features/wiki/hooks/use-kb-chat-pending";

type SourcesSheetState =
  | { kind: "closed" }
  | { kind: "manage" }
  | { kind: "scope" };

export default function KnowledgeBasePage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const qc = useQueryClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [input, setInput] = useState("");
  const [conversationsOpen, setConversationsOpen] = useState(false);
  const [conversationsSearch, setConversationsSearch] = useState("");
  const [sourcesSheet, setSourcesSheet] = useState<SourcesSheetState>({ kind: "closed" });
  const [noteOpen, setNoteOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const rawConversation = searchParams.get("conversation");
  const activeConversationId: number | null =
    rawConversation !== null && Number.isFinite(Number(rawConversation)) && Number(rawConversation) > 0
      ? Number(rawConversation)
      : null;

  const conversationMessages = useKbConversationMessages(activeConversationId, true);
  const { hasNextPage, isFetchingNextPage, fetchNextPage, isLoading } = conversationMessages;

  const conversationsQuery = useKbConversations(conversationsOpen);
  const renameConversation = useRenameKbConversation();
  const deleteConversation = useDeleteKbConversation();

  const sourcesQuery = useInfiniteKbPageCollection({ kind: "file" });
  const uploadFile = useUploadKbFile();
  const deleteSource = useDeleteKbPage();

  const scope = useKbScopeFilter({
    currentUserId,
    scopeSheetOpen: sourcesSheet.kind === "scope",
  });

  function setConversation(id: number | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === null) params.delete("conversation");
    else params.set("conversation", String(id));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const persisted: ChatMessage[] = (conversationMessages.data?.pages ?? [])
    .flatMap((page) => page.messages)
    .slice()
    .reverse()
    .map((m) => ({
      id: String(m.id),
      role: m.role,
      content: m.content,
      citations: m.citations ?? undefined,
      createdAt: m.createdAt,
    }));

  const rows = buildKbHistoryRows(persisted);
  const questionByAssistantId = questionForAssistantId(persisted);

  const {
    scrollRef,
    topSentinelRef,
    handleScroll,
    loadOlder,
    markNearBottom,
    scrollToBottomIfNear,
  } = useKbChatScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    persistedLength: persisted.length,
  });

  const chatPending = useKbChatPending({
    activeConversationId,
    setConversation,
    scopePayload: scope.scopePayload,
    scopeSpaceId: scope.scopeSpaceId,
    markNearBottom,
  });

  const { pending, ask, sendMessage, handleStop, handleRegenerate, handleDismissPending, cancelGeneration } =
    chatPending;

  useEffect(() => {
    scrollToBottomIfNear();
  }, [pending, ask.isPending, scrollToBottomIfNear]);

  const sources = (sourcesQuery.data?.pages ?? []).flatMap((page) => page.data);
  const readyCount = sources.filter((s) => s.status === "published").length;

  const allConversations = (conversationsQuery.data?.pages ?? []).flatMap((p) => p.conversations);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
  }
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (sendMessage(input)) setInput("");
    }
  }
  function handleSend() {
    if (sendMessage(input)) setInput("");
  }
  function handleSuggestion(e: React.MouseEvent<HTMLButtonElement>) {
    sendMessage(e.currentTarget.dataset.suggestion ?? "");
  }
  function handleCitationClick(e: React.MouseEvent<HTMLButtonElement>) {
    const pageId = Number(e.currentTarget.dataset.pageId);
    if (pageId) router.push(pageHref(pageId));
    const linkedDocumentId = Number(e.currentTarget.dataset.linkedDocumentId);
    if (linkedDocumentId) router.push(companyDocumentHref(linkedDocumentId));
  }

  function handleToggleConversations() {
    setConversationsOpen((prev) => {
      if (prev) setConversationsSearch("");
      return !prev;
    });
  }
  function handleConversationsSearchChange(v: string) {
    setConversationsSearch(v);
  }
  function handleSelectConversation(id: number) {
    cancelGeneration();
    setConversation(id);
    setConversationsOpen(false);
  }
  function handleNewChat() {
    cancelGeneration();
    setConversation(null);
    setConversationsOpen(false);
  }
  function handleLoadMoreConversations() {
    void conversationsQuery.fetchNextPage();
  }
  function handleDeleteConversation(id: number) {
    deleteConversation.mutate(id, {
      onSuccess: () => {
        if (id === activeConversationId) setConversation(null);
        void qc.invalidateQueries({
          queryKey: knowledgeAndSurveysQueryKeys.kb.chatConversations(),
        });
      },
      onError: (error) =>
        toast.error("Couldn't delete conversation", {
          description: getErrorMessage(error),
        }),
    });
  }
  function handleRenameConversation(conversationId: number, title: string) {
    renameConversation.mutate({ conversationId, title });
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    uploadFile.mutate({ file }, {
      onSuccess: () => toast.success("File added to My files and indexed for Ask"),
      onError: (error) =>
        toast.error("Upload failed", { description: getErrorMessage(error) }),
    });
  }
  function handleManageSourcesClick() {
    setSourcesSheet({ kind: "manage" });
  }
  function handleScopeClick() {
    scope.onScopeSheetOpen();
    setSourcesSheet({ kind: "scope" });
  }
  function handleSourcesSheetOpenChange(open: boolean) {
    if (!open) setSourcesSheet({ kind: "closed" });
  }
  function handleAddNoteClick() {
    setSourcesSheet({ kind: "closed" });
    setNoteOpen(true);
  }
  function handleScopeConfirm() {
    scope.applyScopePending();
    setSourcesSheet({ kind: "closed" });
  }
  function makeDeleteHandler(id: number) {
    return function handleDeleteSource() {
      deleteSource.mutate(id, {
        onSuccess: () => toast.success("Source removed"),
        onError: (error) =>
          toast.error("Delete failed", { description: getErrorMessage(error) }),
      });
    };
  }

  const pageState = usePageState({ permission: "kb:ai:generate" });

  return (
    <PageState resolution={pageState} loading={null}>
    <PageWrapper
      title="Ask documents"
      subtitle="Ask across your files and docs. Every answer stays grounded in content you can access."
      noInternalScroll
      contentClassName="flex min-h-0 min-w-0 flex-col px-4 sm:px-6"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleToggleConversations}
            aria-pressed={conversationsOpen}
          >
            <MessageSquare className="h-4 w-4" />
            Conversations
          </Button>
          <Button
            variant={scope.scopeActive ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={handleScopeClick}
            aria-label={
              scope.scopeActive
                ? `Searching ${scope.scopeSummary}`
                : "Choose sources to search"
            }
          >
            <SlidersHorizontal className="h-4 w-4" />
            {scope.scopeActive ? scope.scopeSummary : "Scope"}
          </Button>
          <LoadingButton
            variant="outline"
            size="sm"
            className="gap-1.5"
            isPending={uploadFile.isPending}
            onClick={handleManageSourcesClick}
          >
            {!uploadFile.isPending && <BookOpenTextIcon size={16} />}
            Sources
          </LoadingButton>
        </div>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.xlsx,.txt,.md,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

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
                            <button
                              type="button"
                              onClick={loadOlder}
                              className="flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-dense font-medium text-muted-foreground transition-colors hover:bg-muted"
                            >
                              <ChevronUp className="h-3 w-3" />
                              Load older messages
                            </button>
                          )}
                        </div>
                      ) : (
                        persisted.length > 0 && (
                          <p className="pb-1 text-center text-micro text-muted-foreground">
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
                            evidence={
                              row.message.role === "assistant" &&
                              row.message.citations?.length ? (
                                <CitationEvidenceList citations={row.message.citations} />
                              ) : undefined
                            }
                            actions={
                              row.message.role === "assistant" &&
                              questionByAssistantId.has(row.message.id) ? (
                                <>
                                  <CopyAnswerButton text={row.message.content} />
                                  <AnswerFeedbackBar
                                    question={questionByAssistantId.get(row.message.id) ?? ""}
                                  />
                                </>
                              ) : undefined
                            }
                          />
                        ),
                      )}
                      {pending &&
                        (ask.isPending ||
                          pending.error ||
                          pending.isQuotaError) && (
                          <ChatBubble
                            key="pending-user"
                            message={{
                              id: "pending-user",
                              role: "user",
                              content: pending.question,
                            }}
                            onCitation={handleCitationClick}
                            reduce={Boolean(reduce)}
                          />
                        )}
                      {pending?.isQuotaError && (
                        <OverQuotaBanner
                          limit={
                            pending.quotaMessage ?? "AI credit limit reached"
                          }
                        />
                      )}
                      {pending?.error && !pending.isQuotaError && (
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
                      {pending?.error &&
                        !pending.isQuotaError &&
                        !ask.isPending && (
                          <Button variant="outline" onClick={handleRegenerate}>
                            Generate a new answer
                          </Button>
                        )}
                      {pending?.answer && pending.error && (
                        <p role="status" className="text-xs text-muted-foreground">
                          Partial answer — generation did not complete.
                        </p>
                      )}
                      {pending?.hasContext === false && (
                        <InsufficientEvidenceBanner
                          question={pending.question}
                          spaceId={pending.spaceId}
                        />
                      )}
                      {pending?.disagreement && (
                        <DisagreementBanner
                          summary={pending.disagreement.summary}
                        />
                      )}
                      {pending?.answer && (
                        <ChatBubble
                          message={{
                            id: "pending-answer",
                            role: "assistant",
                            content: pending.answer,
                            citations: pending.citations,
                          }}
                          onCitation={handleCitationClick}
                          reduce={Boolean(reduce)}
                          evidence={
                            pending.citations?.length ? (
                              <CitationEvidenceList citations={pending.citations} />
                            ) : undefined
                          }
                          actions={
                            !ask.isPending &&
                            !pending.error &&
                            !pending.isQuotaError ? (
                              <>
                                <CopyAnswerButton text={pending.answer} />
                                <AnswerFeedbackBar question={pending.question} />
                              </>
                            ) : undefined
                          }
                        />
                      )}
                      {ask.isPending && !pending?.answer && (
                        <TypingBubble reduce={Boolean(reduce)} />
                      )}
                      {(pending?.hasContext === false ||
                        pending?.disagreement) &&
                        !ask.isPending && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDismissPending}
                            >
                              Dismiss
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRegenerate}
                            >
                              Try again
                            </Button>
                          </div>
                        )}
                    </>
                  )}
                </div>
              </ScrollArea>

              <div className="shrink-0 border-t border-border bg-background/60 p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about your files, notes and wiki…"
                    className="h-9 min-w-0 flex-1 rounded-xl text-sm"
                    autoFocus
                  />
                  {ask.isPending && (
                    <Button variant="outline" onClick={handleStop}>
                      Stop
                    </Button>
                  )}
                  <Button
                    onClick={handleSend}
                    disabled={ask.isPending || !input.trim()}
                    className="h-9 w-9 shrink-0 rounded-xl p-0"
                    aria-label="Send"
                  >
                    <motion.span whileTap={reduce ? undefined : { scale: 0.85 }}>
                      <Send className="h-4 w-4" />
                    </motion.span>
                  </Button>
                </div>
                <p className="mt-1.5 text-micro text-muted-foreground">
                  {scope.scopeActive
                    ? scope.scopeItemCount > 0
                      ? `Searching ${scope.scopeItemCount} selected item${scope.scopeItemCount === 1 ? "" : "s"}.`
                      : "Searching with selected filters."
                    : "Searching all accessible knowledge."}{" "}
                  <button
                    type="button"
                    onClick={handleScopeClick}
                    className="underline hover:text-foreground"
                  >
                    Edit
                  </button>
                  {scope.scopeActive && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        onClick={scope.clearScope}
                        className="underline hover:text-foreground"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {sourcesSheet.kind === "manage" && (
        <KbSourcesSheet
          mode="manage"
          open
          onOpenChange={handleSourcesSheetOpenChange}
          sources={sources}
          isLoading={sourcesQuery.isLoading}
          sourceError={sourcesQuery.isError ? sourcesQuery.error : null}
          sourceHasMore={sourcesQuery.hasNextPage}
          sourceIsFetchingMore={sourcesQuery.isFetchingNextPage}
          onSourceLoadMore={() => {
            void sourcesQuery.fetchNextPage();
          }}
          onSourceRetry={() => {
            void sourcesQuery.refetch();
          }}
          readyCount={readyCount}
          onUploadClick={handleUploadClick}
          uploadPending={uploadFile.isPending}
          onAddNoteClick={handleAddNoteClick}
          makeDeleteHandler={makeDeleteHandler}
          deletingId={deleteSource.variables}
          isDeleting={deleteSource.isPending}
        />
      )}

      {sourcesSheet.kind === "scope" && (
        <KbSourcesSheet
          mode="scope"
          open
          onOpenChange={handleSourcesSheetOpenChange}
          sources={scope.scopeDisplaySources}
          isLoading={
            scope.activeScopeSourcesQuery.isLoading
          }
          sourceError={
            scope.activeScopeSourcesQuery.isError
              ? scope.activeScopeSourcesQuery.error
              : null
          }
          sourceHasMore={scope.activeScopeSourcesQuery.hasNextPage}
          sourceIsFetchingMore={scope.activeScopeSourcesQuery.isFetchingNextPage}
          onSourceLoadMore={() => {
            void scope.activeScopeSourcesQuery.fetchNextPage();
          }}
          onSourceRetry={() => {
            void scope.activeScopeSourcesQuery.refetch();
          }}
          selectedIds={scope.pendingScopeIds}
          onSelectionChange={scope.handleScopeSelectionChange}
          verifiedOnly={scope.pendingVerifiedOnly}
          onVerifiedOnlyChange={scope.handleScopeVerifiedOnlyChange}
          currentUserId={currentUserId ?? undefined}
          ownerFilter={scope.scopeOwnerFilter}
          onOwnerFilterChange={scope.setScopeOwnerFilter}
          spaceIdFilter={scope.pendingSpaceId}
          onSpaceIdFilterChange={scope.setPendingSpaceId}
          spaces={scope.kbSpaces}
          ownerMembershipId={scope.pendingOwnerMembershipId}
          onOwnerMembershipIdChange={scope.setPendingOwnerMembershipId}
          owners={scope.scopeOwners}
          selectedOwner={scope.selectedScopeOwner}
          onOwnerSearchChange={scope.setOwnerSearch}
          ownersAreLoading={scope.ownersQuery.isLoading}
          ownersHasMore={scope.ownersQuery.hasNextPage}
          ownersAreFetchingMore={scope.ownersQuery.isFetchingNextPage}
          onOwnersLoadMore={scope.handleOwnersLoadMore}
          ownersError={scope.ownersQuery.error}
          onOwnersRetry={scope.handleOwnersRetry}
          statusScope={scope.pendingStatus}
          onStatusScopeChange={scope.setPendingStatus}
          onConfirm={handleScopeConfirm}
          pageSearchQuery={scope.pageSearchQuery}
          onPageSearchQueryChange={scope.setPageSearchQuery}
          pageSearchResults={scope.pageSearchResults}
          pageSearchIsLoading={scope.pageSearchIsLoading}
          selectedPageIds={scope.pendingPageIds}
          onPageSelectionChange={scope.setPendingPageIds}
        />
      )}

      <KbNoteSheet open={noteOpen} onOpenChange={setNoteOpen} />
    </PageWrapper>
    </PageState>
  );
}
