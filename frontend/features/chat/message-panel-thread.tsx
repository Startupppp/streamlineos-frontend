"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ChatPanelFallback } from "./chat-lazy-fallbacks";

const ThreadPanel = dynamic(
  () => import("./thread-panel").then((m) => ({ default: m.ThreadPanel })),
  { ssr: false, loading: () => <ChatPanelFallback label="Loading thread" /> },
);

interface MessagePanelThreadProps {
  thread: {
    messageId: number | null;
    highlightedReplyId?: number | null;
    channelId: number;
    currentUserId: string;
    onClose: () => void;
  };
  isPanelNarrow: boolean;
}

export function MessagePanelThread({ thread, isPanelNarrow }: MessagePanelThreadProps) {
  const isThreadOpen = thread.messageId !== null;

  function handleThreadOpenChange(open: boolean) {
    if (!open) thread.onClose();
  }

  return (
    <>
      <AnimatePresence>
        {thread.messageId !== null && !isPanelNarrow && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="hidden shrink-0 flex-col overflow-hidden border-l border-border/40 lg:flex"
          >
            <ThreadPanel
              channelId={thread.channelId}
              parentMessageId={thread.messageId}
              currentUserId={thread.currentUserId}
              onClose={thread.onClose}
              highlightedReplyId={thread.highlightedReplyId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isPanelNarrow && (
        <Sheet open={isThreadOpen} onOpenChange={handleThreadOpenChange}>
          <SheetContent showCloseButton={false} className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md lg:hidden">
            <SheetTitle className="sr-only">Thread</SheetTitle>
            {thread.messageId !== null && (
              <ThreadPanel
                channelId={thread.channelId}
                parentMessageId={thread.messageId}
                currentUserId={thread.currentUserId}
                onClose={thread.onClose}
                highlightedReplyId={thread.highlightedReplyId}
              />
            )}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
