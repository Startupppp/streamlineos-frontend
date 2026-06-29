"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useSession } from "next-auth/react";
import { MessageSquare, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (!orgId) return;
    const ch = ably.channels.get(`huddle:${orgId}:${channelId}`);
    const handler = (msg: InboundMessage) => {
      const data = msg.data as HuddleChatMessageData;
      setMessages((prev) => [
        ...prev,
        { id: msg.id ?? `${Date.now()}`, userId: data.userId, name: data.name, content: data.content, sentAt: new Date() },
      ]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    };
    ch.subscribe("huddle:chat", handler);
    return () => {
      ch.unsubscribe("huddle:chat", handler);
    };
  }, [ably, channelId, orgId]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || !orgId) return;
    setInput("");
    const ch = ably.channels.get(`huddle:${orgId}:${channelId}`);
    await ch.publish("huddle:chat", { userId: currentUserId, name: userName, content });
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
    <div className="flex flex-col h-full w-72 border-l border-white/10 bg-zinc-900/80">
      <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-white/60" />
          <h3 className="text-[13px] font-semibold text-white">Huddle Chat</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg" aria-label="Close">
          <X className="h-3.5 w-3.5 text-white/60" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex flex-col", msg.userId === currentUserId ? "items-end" : "items-start")}>
            <span className="text-[10px] text-white/40 mb-0.5">{msg.name}</span>
            <div
              className={cn(
                "max-w-[220px] px-3 py-1.5 rounded-xl text-[12px] leading-[1.5]",
                msg.userId === currentUserId
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-white/10 text-white rounded-bl-md",
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 p-3 border-t border-white/10">
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="flex-1 bg-transparent text-[12px] text-white placeholder:text-white/40 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 transition-colors"
            aria-label="Send"
          >
            <Send className="h-3 w-3 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
