"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  ChevronRight,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const CONTEXT_PROMPTS: Record<string, { label: string; prompts: string[] }> = {
  "/hr": {
    label: "HR Assistant",
    prompts: [
      "Summarize attendance this week",
      "Draft a leave policy update",
      "Who has pending leave requests?",
    ],
  },
  "/projects": {
    label: "Project Assistant",
    prompts: [
      "What tickets are overdue?",
      "Summarize sprint progress",
      "Draft a standup update",
    ],
  },
  "/crm": {
    label: "CRM Assistant",
    prompts: [
      "Draft a follow-up email",
      "Which leads need attention?",
      "Summarize pipeline health",
    ],
  },
  "/support": {
    label: "Support Assistant",
    prompts: [
      "Which tickets breach SLA?",
      "Draft a resolution response",
      "Summarize open tickets",
    ],
  },
  "/billing": {
    label: "Finance Assistant",
    prompts: [
      "Summarize outstanding invoices",
      "Which invoices are overdue?",
      "Draft a payment reminder",
    ],
  },
  "/dashboard": {
    label: "Dashboard Assistant",
    prompts: [
      "Give me a daily summary",
      "What needs my attention?",
      "Summarize team activity",
    ],
  },
};

function getContext(pathname: string) {
  for (const [prefix, ctx] of Object.entries(CONTEXT_PROMPTS)) {
    if (pathname.startsWith(prefix)) return ctx;
  }
  return { label: "AI Assistant", prompts: ["How can I help you today?", "Summarize my tasks", "Draft an email"] };
}

export function AISidebar() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const context = getContext(pathname);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const content = text || input.trim();
    if (!content || isLoading) return;
    setInput("");

    const userMsg: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
        return;
      }

      const data = await res.json();
      const assistantContent = data?.response || data?.content || data?.message || "I processed your request.";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantContent }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Failed to connect. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-gradient-to-br from-[#bd882c] to-[#d4a544] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
      >
        <Sparkles className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-gradient-to-r from-[#bd882c]/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#bd882c] to-[#d4a544] flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">{context.label}</p>
            <p className="text-[10px] text-muted-foreground">Powered by AI</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 ? (
          <div className="space-y-3 pt-4">
            <p className="text-xs text-muted-foreground text-center mb-4">Quick suggestions for this page:</p>
            {context.prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 hover:bg-muted/30 hover:border-[#bd882c]/30 transition-colors text-left"
              >
                <ChevronRight className="h-3.5 w-3.5 text-[#bd882c] shrink-0" />
                <span className="text-[13px]">{prompt}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#bd882c]/20 to-[#bd882c]/5 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-[#bd882c]" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] px-3 py-2 rounded-xl text-[13px] leading-relaxed",
                  msg.role === "user"
                    ? "bg-gradient-to-br from-[#bd882c] to-[#c9963a] text-white rounded-br-md"
                    : "bg-muted/50 border border-border/30 rounded-bl-md"
                )}>
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="h-6 w-6 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#bd882c]/20 to-[#bd882c]/5 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-[#bd882c]" />
                </div>
                <div className="bg-muted/50 border border-border/30 rounded-xl rounded-bl-md px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      <div className="px-3 py-2.5 border-t border-border/40">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Ask anything..."
            className="min-h-[36px] max-h-[80px] text-[13px] resize-none"
            rows={1}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-9 w-9 shrink-0 bg-[#bd882c] hover:bg-[#bd882c]/90 text-white"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
