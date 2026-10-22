import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { ChatHomePage } from "@/features/chat/chat-home-page";
import { prefetchChat } from "@/lib/prefetch/chat";
import ChatLoading from "./loading";

async function ChatHydrated() {
  const state = await prefetchChat();
  return (
    <HydrationBoundary state={state}>
      <ChatHomePage />
    </HydrationBoundary>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ChatLoading />}>
      <ChatHydrated />
    </Suspense>
  );
}
