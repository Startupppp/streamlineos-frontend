"use client";

import { useMemo } from "react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Loader2, Paperclip } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import React from "react";
import { cn } from "@/lib/utils";
import { useChannelFiles } from "@/hooks/api";
import { formatFileSize, getFileExt, getFileColor, resolveFileUrl, isImageMime } from "./chat-helpers";

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

export function SharedFilesPanel({ channelId, onClose }: { channelId: number; onClose: () => void }) {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useChannelFiles(channelId);
  const files = useMemo(() => data?.pages.flatMap((p) => p.files) ?? [], [data]);

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
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Paperclip className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <h4 className="text-label font-semibold mb-1">No files yet</h4>
            <p className="text-dense text-muted-foreground text-center">Files shared in this channel appear here.</p>
          </div>
        ) : (
          <div className="py-2">
            {files.map((file) => {
              const url = resolveFileUrl(file.fileUrl, file.mimeType);
              const colors = getFileColor(file.fileName);
              return isImageMime(file.mimeType) ? (
                <a
                  key={file.id}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 hover:bg-muted/30 transition-colors"
                >
                  <Image src={url} alt={file.fileName} width={400} height={120} className="w-full rounded-lg object-cover max-h-[120px]" />
                  <p className="text-dense text-muted-foreground mt-1 truncate">{file.fileName}</p>
                </a>
              ) : (
                <a
                  key={file.id}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <div className={cn("h-9 w-9 rounded-lg flex flex-col items-center justify-center shrink-0", colors.bg)}>
                    <FileText className={cn("h-4 w-4", colors.text)} />
                    <span className={cn("text-[6px] font-bold text-white px-1 rounded mt-0.5", colors.badge)}>
                      {getFileExt(file.fileName)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{file.fileName}</p>
                    <p className="text-micro text-muted-foreground">{formatFileSize(file.fileSize)}</p>
                  </div>
                </a>
              );
            })}
            {hasNextPage && (
              <div className="flex justify-center py-3">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-dense text-primary hover:underline disabled:opacity-50"
                >
                  {isFetchingNextPage ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
