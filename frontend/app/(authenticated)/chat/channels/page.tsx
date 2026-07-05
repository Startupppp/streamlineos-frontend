"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChannelSidebar } from "@/features/chat/channel-sidebar";
import { ChannelsDiscoveryPage } from "@/features/chat/channels-discovery-page";
import { ChatTopNav } from "@/features/chat/chat-top-nav";

export default function ChatChannelsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const handleSelectChannel = useCallback(
    (channelId: number) => router.push(`/chat?channel=${channelId}`),
    [router],
  );

  return (
    <div className="flex flex-col h-full">
      <ChatTopNav />
      <div className="flex flex-1 overflow-hidden bg-background">
        <div className="hidden md:flex flex-col shrink-0 border-r border-border/40 bg-card/50 w-[300px] lg:w-[340px]">
          <ChannelSidebar
            activeChannelId={null}
            onSelectChannel={handleSelectChannel}
            currentUserId={currentUserId ?? ""}
          />
        </div>
        <ChannelsDiscoveryPage />
      </div>
    </div>
  );
}
