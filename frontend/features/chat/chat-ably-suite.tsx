"use client";

import type { ReactNode } from "react";
import { ChatAblyProvider } from "./ably-provider";
import { useChatPresence } from "./use-chat-presence";
import { useChatChannels } from "@/hooks/api/chat-core-read";
import { useChatGlobalNotifications } from "@/hooks/api/chat-notifications";

function PresenceManager() {
  useChatPresence();
  return null;
}

function GlobalNotifications({
  activeChannelId,
  currentUserId,
}: {
  activeChannelId: number | null;
  currentUserId: string | undefined;
}) {
  const { channels } = useChatChannels();
  useChatGlobalNotifications(channels, activeChannelId, currentUserId);
  return null;
}

interface ChatAblySuiteProps {
  children: ReactNode;
  activeChannelId: number | null;
  currentUserId: string | undefined;
}

export function ChatAblySuite({
  children,
  activeChannelId,
  currentUserId,
}: ChatAblySuiteProps) {
  return (
    <ChatAblyProvider>
      <PresenceManager />
      <GlobalNotifications
        activeChannelId={activeChannelId}
        currentUserId={currentUserId}
      />
      {children}
    </ChatAblyProvider>
  );
}
