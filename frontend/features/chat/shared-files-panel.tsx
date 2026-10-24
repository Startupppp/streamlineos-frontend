"use client";

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useChannelFiles } from "@/hooks/api/chat-channel-files";
import { ChatAttachment } from "./chat-attachment";
import { usePanelRenderWindow } from "./panel-render-window";
import { TablePagination } from "@/components/ui/table-pagination";

function handleNoPrevious() {}

export function SharedFilesPanel({ channelId }: { channelId: number }) {
  const { data, isLoading, isError, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useChannelFiles(channelId);
  const files = useMemo(() => data?.pages.flatMap((p) => p.files) ?? [], [data]);
  const total = files.length;
  const renderWindow = usePanelRenderWindow(total, hasNextPage === true, fetchNextPage, channelId);
  const visibleFiles = useMemo(
    () => files.slice(0, renderWindow.visibleCount),
    [files, renderWindow.visibleCount],
  );

  function handleRetry() {
    void refetch();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-1 p-2" aria-busy="true">
            <span role="status" className="sr-only">Loading shared files…</span>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-2.5 items-center px-2 py-2">
                <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            compact
            className="m-3"
            title="Couldn't load shared files"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : files.length === 0 ? (
          <div className="flex min-h-[min(28rem,70dvh)] flex-col items-center justify-center px-6 py-10">
            <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </div>
            <h4 className="mb-1 text-label font-semibold">No files yet</h4>
            <p className="max-w-xs text-center text-dense text-muted-foreground">
              Files shared in this channel appear here.
            </p>
          </div>
        ) : (
          <div className="py-2">
            <div role="list" aria-label="Shared files">
              {visibleFiles.map((file, index) => (
                <div
                  key={file.id}
                  role="listitem"
                  aria-posinset={index + 1}
                  aria-setsize={hasNextPage ? -1 : total}
                  className="px-2 py-1"
                >
                  <ChatAttachment
                    channelId={channelId}
                    attachmentId={file.id}
                    fileName={file.fileName}
                    mimeType={file.mimeType}
                    fileSize={file.fileSize}
                  />
                </div>
              ))}
            </div>
            {renderWindow.hasMore && (
              <TablePagination
                mode="cursor"
                rowCount={renderWindow.visibleCount}
                hasMore={renderWindow.hasMore}
                hasPrevious={false}
                onNext={renderWindow.onLoadMore}
                onPrevious={handleNoPrevious}
                disabled={isFetchingNextPage}
              />
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
