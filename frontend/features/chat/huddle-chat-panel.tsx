"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useSession } from "next-auth/react";
import { MessageSquare } from "lucide-react";
import { XIcon, SendIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { safeSubscribe, safeUnsubscribe } from "@/lib/ably-safe-subscribe";
import { huddleChannelName } from "@/lib/ably-channels";

interface HuddleChatMessage {
  id: string;
  userId: string;
  name: string;
  content: string;
  sentAt: Date;
}

interface HuddleChatMessageData {
  userId: string;
  name: string;
  content: string;
}

export function HuddleChatPanel({
  channelId,
  currentUserId,
  onClose,
}: {
  channelId: number;
  currentUserId: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<HuddleChatMessage[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const ably = useAbly();
  const orgId = session?.orgId;
  const userName = session?.user?.name ?? "Unknown";
  const { iconRef: closeIconRef, hoverHandlers: closeHoverHandlers } = useAnimatedIcon();
  const { iconRef: sendIconRef, hoverHandlers: sendHoverHandlers } = useAnimatedIcon();

  useEffect(() => {
    if (!orgId) return;
    if (
      ably.connection.state === "closed" ||
      ably.connection.state === "failed"
    )
      return;

    const ch = ably.channels.get(huddleChannelName(orgId, channelId));
    let cancelled = false;
    let didSubscribe = false;

    const handleChatMessage = (msg: InboundMessage) => {
      const data = msg.data as HuddleChatMessageData;
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id ?? `${Date.now()}`,
          userId: data.userId,
          name: data.name,
          content: data.content,
          sentAt: new Date(),
        },
      ]);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    };

    async function setup() {
      try {
        if (ably.connection.state !== "connected") {
          await ably.connection.whenState("connected");
        }
        if (cancelled) return;
        const ok = await safeSubscribe(ch, "huddle:chat", handleChatMessage);
        if (cancelled) {
          if (ok) safeUnsubscribe(ch, "huddle:chat", handleChatMessage);
          return;
        }
        if (ok) didSubscribe = true;
      } catch {
        return;
      }
    }

    void setup();

    return () => {
      cancelled = true;
      if (!didSubscribe) return;
      safeUnsubscribe(ch, "huddle:chat", handleChatMessage);
    };
  }, [ably, channelId, orgId]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || !orgId) return;
    setInput("");
    const ch = ably.channels.get(huddleChannelName(orgId, channelId));
    await ch.publish("huddle:chat", {
      userId: currentUserId,
      name: userName,
      content,
    });
  }, [input, ably, channelId, orgId, currentUserId, userName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="flex flex-col h-full w-72 border-l border-white/10 bg-muted">
      <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-white/60" />
          <h3 className="text-label font-semibold text-white">Huddle Chat</h3>
        </div>
        <button
          onClick={onClose}
          {...closeHoverHandlers}
          className="p-1 hover:bg-white/10 rounded-lg"
          aria-label="Close"
        >
          <XIcon ref={closeIconRef} size={14} className="text-white/60" />
        </button>
      </div>

      <ScrollArea hideScrollbar className="min-h-0 flex-1">
        <div className="overscroll-contain space-y-2 py-3 px-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col",
              msg.userId === currentUserId ? "items-end" : "items-start",
            )}
          >
            <span className="text-micro text-white/40 mb-0.5">{msg.name}</span>
            <div
              className={cn(
                "max-w-[220px] px-3 py-1.5 rounded-xl text-xs leading-[1.5]",
                msg.userId === currentUserId
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-white/10 text-white rounded-bl-md",
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="shrink-0 p-3 border-t border-white/10">
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-white/40 focus:outline-none"
          />
          <button
            onClick={handleSend}
            {...sendHoverHandlers}
            disabled={!input.trim()}
            className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
            aria-label="Send"
          >
            <SendIcon ref={sendIconRef} size={12} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
