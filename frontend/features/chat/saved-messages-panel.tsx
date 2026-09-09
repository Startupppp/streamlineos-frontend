"use client";

import { useCallback, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bookmark, Hash } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import React from "react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSavedMessages, useUnsaveMessage, useChatOrgUsers } from "@/hooks/api";
import { formatMessageTime, buildChatUserMap, resolveChatUserName } from "./chat-helpers";
import { panelRevealLabel, usePanelRenderWindow } from "./panel-render-window";
import type { SavedMessage } from "@/types/chat";
import { getInitials } from "@/lib/format-utils";

const UnsaveButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function UnsaveButton({ className, ...props }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button ref={ref} {...hoverHandlers} className={className} {...props}>
      <XIcon ref={iconRef} size={12} className="text-muted-foreground" />
    </button>
  );
});

function SavedMessageCard({
  item,
  onUnsave,
  onJump,
  resolveUserName,
}: {
  item: SavedMessage;
  onUnsave: (messageId: number) => void;
  onJump: (channelId: number) => void;
  resolveUserName: (
    userId: string | null,
    embedded?: { name?: string | null; email?: string | null } | null,
  ) => string;
}) {
  const handleJump = useCallback(() => {
    if (item.message.channel) onJump(item.message.channel.id);
  }, [item.message.channel, onJump]);

  const handleUnsave = useCallback(() => onUnsave(item.messageId), [item.messageId, onUnsave]);
  const senderName = resolveUserName(item.message.senderId, item.message.sender);

  return (
    <div className="group px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0">
      <div className="flex items-start gap-3">
        <Avatar className="w-7 shrink-0 mt-0.5 border border-border/30">
          <AvatarImage src={resolveImageUrl(item.message.sender?.image)} />
          <AvatarFallback className="text-micro font-bold bg-muted text-muted-foreground">
            {getInitials(senderName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-xs font-bold text-foreground">{senderName}</span>
            {item.message.channel && (
              <button
                onClick={handleJump}
                className="flex items-center gap-1 text-micro text-primary hover:underline"
              >
                <Hash className="h-2.5 w-2.5" />
                {item.message.channel.name}
              </button>
            )}
            <span className="text-micro text-muted-foreground ml-auto">{formatMessageTime(item.message.createdAt)}</span>
          </div>
          <p className="text-xs text-foreground leading-[1.5] line-clamp-3">{item.message.content}</p>
          {item.message.attachments.length > 0 && (
            <p className="text-dense text-muted-foreground mt-1">
              {item.message.attachments.length} attachment{item.message.attachments.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <UnsaveButton
          onClick={handleUnsave}
          className={cn(
            "h-6 w-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted",
          )}
          title="Unsave"
          aria-label="Unsave message"
        />
      </div>
    </div>
  );
}

const SavedPanelCloseButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function SavedPanelCloseButton({ className, ...props }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button ref={ref} {...hoverHandlers} className={className} {...props}>
      <XIcon ref={iconRef} size={16} className="text-muted-foreground" />
    </button>
  );
});

export function SavedMessagesPanel({
  onClose,
  onJumpToChannel,
}: {
  onClose: () => void;
  onJumpToChannel: (channelId: number) => void;
}) {
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = useSavedMessages();
  const unsave = useUnsaveMessage();
  const { data: orgUsers } = useChatOrgUsers();
  const chatUserMap = useMemo(() => buildChatUserMap(orgUsers), [orgUsers]);
  const resolveUserName = useCallback(
    (
      userId: string | null,
      embedded?: { name?: string | null; email?: string | null } | null,
    ) => resolveChatUserName(userId, embedded, chatUserMap),
    [chatUserMap],
  );

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

  const total = items.length;
  const renderWindow = usePanelRenderWindow(total, hasNextPage === true, fetchNextPage);
  const visibleItems = useMemo(
    () => items.slice(0, renderWindow.visibleCount),
    [items, renderWindow.visibleCount],
  );

  const handleRetry = useCallback(() => void refetch(), [refetch]);

  return (
    <div className="flex flex-col h-full w-80 border-l border-border/40 bg-card/50">
      <div className="h-[56px] px-4 border-b border-border/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-status-warning-ink fill-amber-500" />
          <h3 className="text-sm font-bold">Saved Messages</h3>
        </div>
        <SavedPanelCloseButton onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg" aria-label="Close" />
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-2 p-3" aria-busy="true">
            <span role="status" className="sr-only">Loading saved messages…</span>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-2.5 p-2">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            compact
            className="m-3"
            title="Couldn't load saved messages"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="h-12 w-12 rounded-xl bg-status-warning-surface flex items-center justify-center mb-3">
              <Bookmark className="h-5 w-5 text-status-warning-ink" />
            </div>
            <h4 className="text-label font-semibold mb-1">No saved messages</h4>
            <p className="text-dense text-muted-foreground text-center leading-relaxed">
              Use <span className="font-medium text-foreground">Save message</span> from a message&apos;s menu.
              Pinning keeps a message in the channel only.
            </p>
          </div>
        ) : (
          <div>
            <div role="list" aria-label="Saved messages">
              {visibleItems.map((item, index) => (
                <div
                  key={item.id}
                  role="listitem"
                  aria-posinset={index + 1}
                  aria-setsize={hasNextPage ? -1 : total}
                >
                  <SavedMessageCard
                    item={item}
                    onUnsave={handleUnsave}
                    onJump={onJumpToChannel}
                    resolveUserName={resolveUserName}
                  />
                </div>
              ))}
            </div>
            {renderWindow.hasMore && (
              <div className="flex justify-center py-3">
                <button
                  type="button"
                  onClick={renderWindow.onLoadMore}
                  disabled={isFetchingNextPage}
                  className="text-dense text-primary hover:underline disabled:opacity-50"
                >
                  {panelRevealLabel(renderWindow, total, isFetchingNextPage, "Load more")}
                </button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
