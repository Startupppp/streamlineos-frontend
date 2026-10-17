"use client";

import { useCallback } from "react";
import { Download, FileText, MessageSquare, Paperclip } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { cn } from "@/lib/utils";
import {
  usePortalProjectFiles,
  usePortalProjectRequests,
  usePortalProjectUpdates,
} from "@/hooks/api/portal/use-portal-project-children";
import {
  SectionHeader,
  formatPortalDate,
  formatPortalStatus,
  portalStatusStyle,
} from "./portal-project-sections";

function SectionSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}

export function FilesSection({ projectId }: { projectId: number }) {
  const files = usePortalProjectFiles(projectId);
  const handleLoadMore = useCallback(() => {
    void files.fetchNextPage();
  }, [files]);

  return (
    <section aria-labelledby="attachments-heading">
      <SectionHeader
        icon={<Paperclip className="h-3.5 w-3.5" />}
        titleId="attachments-heading"
        title="Files"
        count={files.items.length}
      />
      {files.isLoading ? (
        <SectionSkeleton />
      ) : files.items.length === 0 ? (
        <EmptyState
          compact
          illustrationPreset="default"
          title="No attachments"
          description="No files have been shared for this project."
        />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {files.items.map((file) => (
            <div key={file.id} className="flex items-center justify-between px-4 py-3 bg-card gap-4">
              <div className="min-w-0 flex-1">
                <span className="text-sm text-foreground truncate block">{file.filename}</span>
              </div>
              <a
                href={file.url}
                download={file.filename}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Download ${file.filename}`}
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
          <InfiniteScrollSentinel
            hasNextPage={files.hasMore}
            isFetchingNextPage={files.isFetchingNextPage}
            onLoadMore={handleLoadMore}
            label="Load more files"
          />
        </div>
      )}
    </section>
  );
}

export function UpdatesSection({ projectId }: { projectId: number }) {
  const updates = usePortalProjectUpdates(projectId);
  const handleLoadMore = useCallback(() => {
    void updates.fetchNextPage();
  }, [updates]);

  return (
    <section aria-labelledby="comments-heading">
      <SectionHeader
        icon={<MessageSquare className="h-3.5 w-3.5" />}
        titleId="comments-heading"
        title="Updates"
        count={updates.items.length}
      />
      {updates.isLoading ? (
        <SectionSkeleton />
      ) : updates.items.length === 0 ? (
        <EmptyState
          compact
          illustrationPreset="default"
          title="No updates yet"
          description="Project updates from the team will appear here."
        />
      ) : (
        <div className="space-y-3">
          {updates.items.map((update) => (
            <div key={update.id} className="rounded-lg border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-foreground">{update.authorName}</span>
                <span className="text-micro text-muted-foreground">
                  {formatPortalDate(update.createdAt)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {update.body}
              </p>
            </div>
          ))}
          <InfiniteScrollSentinel
            hasNextPage={updates.hasMore}
            isFetchingNextPage={updates.isFetchingNextPage}
            onLoadMore={handleLoadMore}
            label="Load more updates"
          />
        </div>
      )}
    </section>
  );
}

export function RequestsSection({ projectId }: { projectId: number }) {
  const requests = usePortalProjectRequests(projectId);
  const handleLoadMore = useCallback(() => {
    void requests.fetchNextPage();
  }, [requests]);

  return (
    <section aria-labelledby="requests-heading">
      <SectionHeader
        icon={<FileText className="h-3.5 w-3.5" />}
        titleId="requests-heading"
        title="Requests"
        count={requests.items.length}
      />
      {requests.isLoading ? (
        <SectionSkeleton />
      ) : requests.items.length === 0 ? (
        <EmptyState
          compact
          illustrationPreset="default"
          title="No requests yet"
          description="Change requests you submit will appear here once they are processed."
        />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {requests.items.map((request) => (
            <div key={request.id} className="px-4 py-3 bg-card">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-foreground truncate block">{request.title}</span>
                  {request.decisionComment && (
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {request.decisionComment}
                    </p>
                  )}
                  <span className="mt-1 text-micro text-muted-foreground block">
                    {formatPortalDate(request.createdAt)}
                  </span>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 px-1.5 py-0.5 rounded text-micro font-semibold",
                    portalStatusStyle(request.status),
                  )}
                >
                  {formatPortalStatus(request.status)}
                </span>
              </div>
            </div>
          ))}
          <InfiniteScrollSentinel
            hasNextPage={requests.hasMore}
            isFetchingNextPage={requests.isFetchingNextPage}
            onLoadMore={handleLoadMore}
            label="Load more requests"
          />
        </div>
      )}
    </section>
  );
}
