import { ChatShellSkeleton } from "@/features/chat/chat-shell";

export default function ChatLoading() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <ChatShellSkeleton />
    </div>
  );
}
