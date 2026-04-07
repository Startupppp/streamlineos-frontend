"use client";

/**
 * Thin client wrapper that provides the Ably Realtime instance to all
 * chat components via React context (from `ably/react`).
 *
 * Wrap the chat page (or layout) with <ChatAblyProvider> so that any
 * component inside can call useChannel / usePresence hooks.
 */

import { AblyProvider } from "ably/react";
import { getAblyClient } from "@/lib/ably";

export function ChatAblyProvider({ children }: { children: React.ReactNode }) {
  const client = getAblyClient();
  return <AblyProvider client={client}>{children}</AblyProvider>;
}
