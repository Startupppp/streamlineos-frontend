"use client";

import { useCallback, useRef, useState } from "react";
import { Bot, Minus, Send, Sparkles, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAskAI, type AskAIMessage } from "@/hooks/api";
import { MarkdownContent } from "@/components/markdown/markdown-content";

const SUGGESTIONS = [
  "What are my hot leads right now?",
  "Summarize my open deals",
  "How many support tickets are open?",
];

export function AskAIPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<AskAIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, stop, isStreaming } = useAskAI();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleSend = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || isStreaming) return;

      setInput("");
      setErrorMessage(null);
      const nextMessages: AskAIMessage[] = [...messages, { role: "user", content: text }];
      setMessages([...nextMessages, { role: "assistant", content: "" }]);
      scrollToBottom();

      try {
        await sendMessage(nextMessages, (token) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: last.content + token };
            }
            return updated;
          });
          scrollToBottom();
        });
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
        setMessages((prev) => prev.slice(0, -1));
      }
    },
    [input, isStreaming, messages, sendMessage, scrollToBottom],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => void handleSend(suggestion),
    [handleSend],
  );

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex flex-col rounded-xl border border-border bg-card shadow-2xl transition-all duration-300 w-96 ${
        isMinimized ? "h-12" : "h-[480px]"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40 rounded-t-xl shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-semibold text-foreground">Ask AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized((p) => !p)}
            className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
            aria-label={isMinimized ? "Expand" : "Minimize"}
          >
            <Minus className="h-3.5 w-3.5" />
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
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Used for searching information across your database.
                </p>
                <div className="space-y-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={i}
                    className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                  >
                    <Avatar className="h-7 w-7 border shrink-0">
                      <AvatarFallback
                        className={
                          isUser
                            ? "bg-primary text-primary-foreground text-[10px]"
                            : "bg-blue-500/10 text-blue-600 font-semibold text-[10px]"
                        }
                      >
                        {isUser ? "You" : <Bot className="h-3.5 w-3.5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`text-xs rounded-lg px-3 py-2 leading-relaxed ${
                        isUser
                          ? "bg-blue-500 text-white shadow-sm whitespace-pre-wrap"
                          : "bg-muted/60 text-foreground border border-border min-h-[2rem]"
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
                );
              })
            )}
            {errorMessage && (
              <p className="text-[11px] text-destructive px-1">{errorMessage}</p>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex items-center gap-1.5 p-3 border-t bg-muted/20 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Ask AI..."
              disabled={isStreaming}
              className="flex-1 h-8 rounded-md border border-input px-3 text-xs bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
            />
            {isStreaming ? (
              <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={stop}>
                <Square className="h-3 w-3" />
              </Button>
            ) : (
              <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={!input.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </form>
        </>
      )}
    </div>
  );
}
