"use client";

import { ChannelsDiscoveryPage } from "@/features/chat/channels-discovery-page";
import { ChatShell } from "@/features/chat/chat-shell";

export default function ChatChannelsPage() {
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <ChatShell>
        <ChannelsDiscoveryPage />
      </ChatShell>
    </div>
  );
}
