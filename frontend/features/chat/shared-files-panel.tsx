"use client";

import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import React from "react";
import { useChannelFiles } from "@/hooks/api";
import { ChatAttachment } from "./chat-attachment";
import { usePanelRenderWindow } from "./panel-render-window";
import { TablePagination } from "@/components/ui/table-pagination";

const FilesPanelCloseButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function FilesPanelCloseButton({ className, ...props }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button ref={ref} {...hoverHandlers} className={className} {...props}>
      <XIcon ref={iconRef} size={16} className="text-muted-foreground" />
    </button>
  );
});

function handleNoPrevious() {}

export function SharedFilesPanel({ channelId, onClose }: { channelId: number; onClose: () => void }) {
  const { data, isLoading, isError, error, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useChannelFiles(channelId);
  const files = useMemo(() => data?.pages.flatMap((p) => p.files) ?? [], [data]);
  const total = files.length;
  const renderWindow = usePanelRenderWindow(total, hasNextPage === true, fetchNextPage, channelId);
  const visibleFiles = useMemo(
    () => files.slice(0, renderWindow.visibleCount),
    [files, renderWindow.visibleCount],
  );

  return (
    <div className="flex flex-col h-full w-80 border-l border-border/40 bg-card/50">
      <div className="h-[56px] px-4 border-b border-border/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-bold">Shared Files</h3>
        </div>
        <FilesPanelCloseButton onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg" aria-label="Close" />
      </div>

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
            onRetry={() => void refetch()}
          />
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </div>
            <h4 className="text-label font-semibold mb-1">No files yet</h4>
            <p className="text-dense text-muted-foreground text-center">Files shared in this channel appear here.</p>
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
