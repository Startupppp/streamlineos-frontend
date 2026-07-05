"use client";

import { ChannelsDiscoveryPage } from "@/features/chat/channels-discovery-page";
import { ChatTopNav } from "@/features/chat/chat-top-nav";

export default function ChatChannelsPage() {
  return (
    <div className="flex flex-col h-full">
      <ChatTopNav />
      <div className="flex flex-1 overflow-hidden bg-background">
        <ChannelsDiscoveryPage />
      </div>
    </div>
  );
}
