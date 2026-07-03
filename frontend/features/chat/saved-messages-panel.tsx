"use client";

import { useCallback, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bookmark, Hash, Loader2, X } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSavedMessages, useUnsaveMessage } from "@/hooks/api";
import { getInitials, formatMessageTime } from "./chat-helpers";
import type { SavedMessage } from "@/types/chat";

function SavedMessageCard({
  item,
  onUnsave,
  onJump,
}: {
  item: SavedMessage;
  onUnsave: (messageId: number) => void;
  onJump: (channelId: number) => void;
}) {
  const handleJump = useCallback(() => {
    if (item.message.channel) onJump(item.message.channel.id);
  }, [item.message.channel, onJump]);

  const handleUnsave = useCallback(() => onUnsave(item.messageId), [item.messageId, onUnsave]);

  return (
    <div className="group px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0">
      <div className="flex items-start gap-3">
        <Avatar className="h-7 w-7 shrink-0 mt-0.5 border border-border/30">
          <AvatarImage src={resolveImageUrl(item.message.sender?.image)} />
          <AvatarFallback className="text-[8px] font-bold bg-muted text-muted-foreground">
            {getInitials(item.message.sender?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-[12px] font-bold text-foreground">{item.message.sender?.name ?? "Unknown"}</span>
            {item.message.channel && (
              <button
                onClick={handleJump}
                className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
              >
                <Hash className="h-2.5 w-2.5" />
                {item.message.channel.name}
              </button>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">{formatMessageTime(item.message.createdAt)}</span>
          </div>
          <p className="text-[12px] text-foreground leading-[1.5] line-clamp-3">{item.message.content}</p>
          {item.message.attachments.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {item.message.attachments.length} attachment{item.message.attachments.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={handleUnsave}
          className={cn(
            "h-6 w-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted",
          )}
          title="Unsave"
          aria-label="Unsave message"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

export function SavedMessagesPanel({
  onClose,
  onJumpToChannel,
}: {
  onClose: () => void;
  onJumpToChannel: (channelId: number) => void;
}) {
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = useSavedMessages();
  const unsave = useUnsaveMessage();

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const items = useMemo(
    () => data?.pages.flatMap((p) => p.items).filter((item) => item.message) ?? [],
    [data],
  );

  const handleUnsave = useCallback(async (messageId: number) => {
    try {
      await unsave.mutateAsync(messageId);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [unsave]);

  const handleLoadMore = useCallback(() => fetchNextPage(), [fetchNextPage]);

  return (
    <div className="flex flex-col h-full w-80 border-l border-border/40 bg-card/50">
      <div className="h-[56px] px-4 border-b border-border/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-amber-500 fill-amber-500" />
          <h3 className="text-[14px] font-bold">Saved Messages</h3>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg" aria-label="Close">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <h4 className="text-[13px] font-semibold mb-1">Could not load saved messages</h4>
            <button
              onClick={() => void refetch()}
              className="text-[11px] text-blue-600 hover:underline mt-1"
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
              <Bookmark className="h-5 w-5 text-amber-500" />
            </div>
            <h4 className="text-[13px] font-semibold mb-1">No saved messages</h4>
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Use <span className="font-medium text-foreground">Save message</span> from a message&apos;s menu.
              Pinning keeps a message in the channel only.
            </p>
          </div>
        ) : (
          <div>
            {items.map(item => (
              <SavedMessageCard
                key={item.id}
                item={item}
                onUnsave={handleUnsave}
                onJump={onJumpToChannel}
              />
            ))}
            {hasNextPage && (
              <div className="flex justify-center py-3">
                <button
                  onClick={handleLoadMore}
                  disabled={isFetchingNextPage}
                  className="text-[11px] text-blue-600 hover:underline disabled:opacity-50"
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
