"use client";

import { ChannelsDiscoveryPage } from "@/features/chat/channels-discovery-page";
import { ChatShell } from "@/features/chat/chat-shell";

export default function ChatChannelsPage() {
  return (
    <div className="flex flex-col h-full">
      <ChatShell compactMobileSidebar>
        <ChannelsDiscoveryPage />
      </ChatShell>
    </div>
  );
}
