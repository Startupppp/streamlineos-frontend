"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bookmark, Hash } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSavedMessages, useUnsaveMessage } from "@/hooks/api/chat-saved";
import { useChatOrgUsers } from "@/hooks/api/chat-core-read";
import { formatMessageTime, buildChatUserMap, resolveChatUserName } from "./chat-helpers";
import { usePanelRenderWindow } from "./panel-render-window";
import { TablePagination } from "@/components/ui/table-pagination";
import type { SavedMessage } from "@/types/chat";
import { getInitials } from "@/lib/format-utils";
import {
  CHAT_SIDE_PANEL_HEADER,
  CHAT_SIDE_PANEL_ROOT,
  CHAT_SIDE_PANEL_TITLE,
} from "./chat-side-panel-chrome";

function SavedMessageCard({
  item,
  onUnsave,
  onJump,
  resolveUserName,
}: {
  item: SavedMessage;
  onUnsave: (messageId: number) => void;
  onJump: (channelId: number, messageId: number) => void;
  resolveUserName: (
    userId: string | null,
    embedded?: { name?: string | null; email?: string | null } | null,
  ) => string;
}) {
  const handleJump = useCallback(() => {
    if (item.message.channel) onJump(item.message.channel.id, item.messageId);
  }, [item.message.channel, item.messageId, onJump]);

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
                type="button"
                onClick={handleJump}
                className="flex items-center gap-1 text-micro text-primary hover:underline"
                aria-label={`Open saved message in ${item.message.channel.name ?? "conversation"}`}
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
        <AnimatedIconButton
          type="button"
          icon={XIcon}
          iconSize={12}
          variant="ghost"
          onClick={handleUnsave}
          className="size-7 rounded-lg p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
          title="Remove from saved"
          aria-label="Remove from saved"
        />
      </div>
    </div>
  );
}

export function SavedMessagesPanel({
  onClose,
  onJumped,
}: {
  onClose: () => void;
  onJumped: () => void;
}) {
  const router = useRouter();
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

  function handleNoPrevious() {}

  const handleJump = useCallback(
    (channelId: number, messageId: number) => {
      router.push(`/chat?channel=${channelId}&message=${messageId}`);
      onJumped();
    },
    [router, onJumped],
  );

  const handleRetry = useCallback(() => void refetch(), [refetch]);

  return (
    <div className={CHAT_SIDE_PANEL_ROOT}>
      <div className={CHAT_SIDE_PANEL_HEADER}>
        <div className="flex min-w-0 items-center gap-2">
          <Bookmark className="h-4 w-4 shrink-0 text-status-warning-ink fill-amber-500" />
          <h3 className={CHAT_SIDE_PANEL_TITLE}>Saved messages</h3>
        </div>
        <AnimatedIconButton
          type="button"
          icon={XIcon}
          iconSize={16}
          variant="ghost"
          onClick={onClose}
          className="size-8 shrink-0 rounded-lg p-0 text-muted-foreground"
          aria-label="Close saved messages"
        />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? (
          <div className="space-y-2 p-3" aria-busy="true">
            <span role="status" className="sr-only">Loading saved messages…</span>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-2.5 p-2">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24 max-w-full" />
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
          <div className="flex min-h-[min(28rem,70dvh)] flex-col items-center justify-center px-6 py-10">
            <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-status-warning-surface">
              <Bookmark className="h-5 w-5 text-status-warning-ink" />
            </div>
            <h4 className="mb-1 text-label font-semibold">No saved messages</h4>
            <p className="max-w-xs text-center text-dense leading-relaxed text-muted-foreground">
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
                    onJump={handleJump}
                    resolveUserName={resolveUserName}
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
