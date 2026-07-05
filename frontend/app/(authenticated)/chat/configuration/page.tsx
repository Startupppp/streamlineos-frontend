"use client";

import { ChatConfigurationPage } from "@/features/chat/chat-configuration-page";
import { ChatTopNav } from "@/features/chat/chat-top-nav";

export default function ChatConfigurationRoute() {
  return (
    <div className="flex flex-col h-full">
      <ChatTopNav />
      <ChatConfigurationPage />
    </div>
  );
}
