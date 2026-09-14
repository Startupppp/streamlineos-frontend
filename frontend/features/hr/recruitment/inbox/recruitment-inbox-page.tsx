"use client";

import { useState, useCallback } from "react";
import { useMessageThreads } from "@/hooks/api/hr/recruitment";
import type { MessageThread } from "@/hooks/api/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { Gated, ErrorState } from "@/components/shared";
import { ThreadItem, ThreadPane } from "./recruitment-thread-ui";

export function RecruitmentInboxPage() {
  const threadsQuery = useMessageThreads();
  const threads = threadsQuery.data ?? [];
  const [activeThread, setActiveThread] = useState<MessageThread | null>(null);

  const handleSelectThread = useCallback(
    (t: MessageThread) => setActiveThread(t),
    [],
  );

  function handleRetry() {
    void threadsQuery.refetch();
  }

  return (
    <PageWrapper
      title="Candidate Inbox"
      subtitle="Manage candidate conversations across channels"
      noInternalScroll
    >
      <Gated
        permission="hr:employees:view"
        isLoading={threadsQuery.isLoading}
        isError={threadsQuery.isError}
        isEmpty={threads.length === 0}
        loading={
          <div className="flex gap-4 h-full">
            <div className="w-72 space-y-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="flex-1 rounded-xl" />
          </div>
        }
        error={
          <ErrorState
            title="Unable to load inbox"
            description="Try again. If this keeps happening, check your permissions or contact an admin."
            onRetry={handleRetry}
          />
        }
        empty={
          <RecruitmentEmptyState
            illustration={<EmptyInboxIllustration />}
            title="No messages yet"
            description="Send the first message to a candidate from their profile page."
          />
        }
      >
        <div className="flex gap-0 border rounded-xl overflow-hidden h-full">
          <div className="w-72 border-r flex flex-col shrink-0">
            <div className="px-3 py-2 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {threads.length} Conversations
              </p>
            </div>
            <ScrollArea hideScrollbar className="min-h-0 flex-1">
              <div className="overscroll-contain space-y-0.5 p-2">
              {threads.map((t) => (
                <ThreadItem
                  key={t.candidateId}
                  thread={t}
                  isActive={activeThread?.candidateId === t.candidateId}
                  onSelect={handleSelectThread}
                />
              ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 min-w-0">
            {activeThread ? (
              <ThreadPane thread={activeThread} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a conversation to view messages
              </div>
            )}
          </div>
        </div>
      </Gated>
    </PageWrapper>
  );
}
