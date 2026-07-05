"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, Minus, Maximize2, X, Square, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAskAI, type AskAIMessage } from "@/hooks/api";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { format } from "date-fns";

interface CalendarAiAssistantProps {
  onEventCreated?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const WELCOME: AskAIMessage = {
  role: "assistant",
  content:
    "Hello! I can help you schedule meetings and events on your calendar. Try asking me:\n\n*\"Schedule a meeting with Aditya tomorrow at 10 AM\"*",
};

export function CalendarAiAssistant({ onEventCreated, isOpen, onClose }: CalendarAiAssistantProps) {
  const [messages, setMessages] = useState<AskAIMessage[]>([WELCOME]);
  const [inputValue, setInputValue] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, stop, isStreaming } = useAskAI();
  const qc = useQueryClient();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isMinimized]);

  const handleSend = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? inputValue).trim();
      if (!text || isStreaming) return;

      setInputValue("");
      const userMessages: AskAIMessage[] = [...messages, { role: "user", content: text }];
      setMessages([...userMessages, { role: "assistant", content: "" }]);

      try {
        await sendMessage(userMessages, (token) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: last.content + token };
            }
            return updated;
          });
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });
        void qc.invalidateQueries({ queryKey: queryKeys.calendar.all, exact: false });
        onEventCreated?.();
      } catch (err) {
        toast.error(getErrorMessage(err));
        setMessages((prev) => prev.slice(0, -1));
      }
    },
    [inputValue, isStreaming, messages, sendMessage, qc, onEventCreated],
  );

  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      void handleSend();
    },
    [handleSend],
  );

  const handleToggleMinimize = useCallback(() => setIsMinimized((p) => !p), []);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col rounded-xl border border-border bg-card shadow-2xl transition-all duration-300 ${
        isMinimized ? "h-12" : "h-[480px]"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40 rounded-t-xl shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
          <span className="text-sm font-semibold text-foreground">Ask AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggleMinimize}
            className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
            aria-label={isMinimized ? "Expand" : "Minimize"}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleMinimize}
            className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
            title="Maximize"
            aria-label="Maximize"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
            title="Close"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={i}
                  className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <Avatar className="h-7 w-7 border shrink-0">
                    <AvatarFallback
                      className={`text-[10px] ${isUser ? "bg-primary text-primary-foreground" : "bg-violet-500/10 text-violet-600 font-semibold"}`}
                    >
                      {isUser ? "You" : <Bot className="h-3.5 w-3.5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {isUser ? "You" : "Ask AI"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(), "h:mm a")}
                      </span>
                    </div>
                    <div
                      className={`text-xs rounded-lg px-3 py-2 leading-relaxed ${
                        isUser
                          ? "bg-blue-500 text-white shadow-sm whitespace-pre-wrap"
                          : "bg-muted/60 text-foreground border border-border"
                      }`}
                    >
                      {isUser ? (
                        m.content
                      ) : (
                        <MarkdownContent
                          content={m.content || (isStreaming && i === messages.length - 1 ? "…" : "")}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleFormSubmit}
            className="flex items-center gap-1.5 p-3 border-t bg-muted/20 shrink-0"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask AI to schedule or invite..."
              disabled={isStreaming}
              className="flex-1 h-8 rounded-md border border-input px-3 text-xs bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
            />
            {isStreaming ? (
              <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={stop}>
                <Square className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="h-8 w-8 shrink-0 bg-violet-600 hover:bg-violet-700 text-white"
                disabled={!inputValue.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </form>
        </>
      )}
    </div>
  );
}
