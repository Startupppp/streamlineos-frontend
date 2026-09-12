"use client";

import { Archive, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Channel } from "./chat-types";
import { ChannelSectionList } from "./channel-section-list";
import { ChannelLoadMore } from "./channel-load-more";

interface ChannelArchivedSectionProps {
  isLoading: boolean;
  channels: Channel[];
  isCollapsed: boolean;
  search: string;
  activeChannelId: number | null;
  currentUserId: string;
  onlineUserIds: Set<string>;
  onSelectChannel: (id: number) => void;
  onClose: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onStartCall?: (channelId: number, type: "huddle") => void;
  onOpenSettings?: (channelId: number) => void;
}

export function ChannelArchivedSection({
  isLoading,
  channels,
  isCollapsed,
  search,
  activeChannelId,
  currentUserId,
  onlineUserIds,
  onSelectChannel,
  onClose,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onStartCall,
  onOpenSettings,
}: ChannelArchivedSectionProps) {
  return (
    <div className={cn("py-1", isCollapsed && "md:hidden")}>
      <button
        type="button"
        onClick={onClose}
        className="w-full flex items-center gap-2 px-2 py-2 mb-1 rounded-xl text-left hover:bg-muted/40 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-label font-semibold text-foreground">Archived</span>
      </button>

      {isLoading ? (
        <div className="p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2.5 px-2 py-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          ))}
        </div>
      ) : channels.length > 0 ? (
        <>
          <ChannelSectionList
            channels={channels}
            label="Archived conversations"
            activeChannelId={activeChannelId}
            currentUserId={currentUserId}
            onlineUserIds={onlineUserIds}
            onSelectChannel={onSelectChannel}
            onStartCall={onStartCall}
            onOpenSettings={onOpenSettings}
          />
          <ChannelLoadMore
            hasMore={hasMore}
            isLoading={isLoadingMore}
            onLoadMore={onLoadMore}
            label="Load more archived chats"
          />
        </>
      ) : (
        <div className="text-center py-10 px-4">
          <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Archive className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-label text-muted-foreground font-medium">
            {search ? "No archived chats found" : "No archived chats"}
          </p>
        </div>
      )}
    </div>
  );
}
