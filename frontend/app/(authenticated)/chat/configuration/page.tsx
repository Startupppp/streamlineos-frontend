"use client";

import { ChatConfigurationPage } from "@/features/chat/chat-configuration-page";
import { ChatShell } from "@/features/chat/chat-shell";

export default function ChatConfigurationRoute() {
  return (
    <div className="flex flex-col h-full">
      <ChatShell compactMobileSidebar>
        <ChatConfigurationPage />
      </ChatShell>
    </div>
  );
}
