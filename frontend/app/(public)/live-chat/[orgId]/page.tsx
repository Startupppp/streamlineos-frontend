"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatSession, useSendChatMessage, useStartChatSession } from "@/hooks/api/support/chat-widget";
import { getErrorMessage } from "@/lib/get-error-message";

const SESSION_STORAGE_KEY_PREFIX = "support-chat-session:";

export default function LiveChatWidgetPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const storageKey = `${SESSION_STORAGE_KEY_PREFIX}${orgId}`;

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const startSession = useStartChatSession(orgId);
  const sessionQuery = useChatSession(orgId, sessionToken);
  const sendMessage = useSendChatMessage(orgId, sessionToken);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) setSessionToken(stored);
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [sessionQuery.data?.messages.length]);

  const handleStart = useCallback(() => {
    if (!name.trim() || !firstMessage.trim()) return;
    startSession.mutate(
      { name: name.trim(), email: email.trim() || undefined, message: firstMessage.trim() },
      {
        onSuccess: (result) => {
          window.localStorage.setItem(storageKey, result.sessionToken);
          setSessionToken(result.sessionToken);
        },
      },
    );
  }, [name, email, firstMessage, startSession, storageKey]);

  const handleSend = useCallback(() => {
    if (!draft.trim()) return;
    sendMessage.mutate(draft.trim(), { onSuccess: () => setDraft("") });
  }, [draft, sendMessage]);

  const handleDraftKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (!hydrated) {
    return <main className="min-h-dvh surface-soft" />;
  }

  const messages = sessionQuery.data?.messages ?? [];

  return (
    <main className="min-h-dvh surface-soft flex items-start justify-center pt-8 sm:pt-12 px-4">
      <div className="w-full max-w-md">
        <div className="gradient-brand text-white rounded-t-2xl px-6 py-6 text-center shadow-noir">
          <MessageCircle className="h-6 w-6 mx-auto mb-1" />
          <h1 className="text-xl font-bold tracking-tight">Live Chat</h1>
          <p className="text-white/80 text-sm mt-1">We typically reply within a few minutes.</p>
        </div>

        <Card className="rounded-t-none border-t-0 shadow-noir overflow-hidden">
          {!sessionToken ? (
            <div className="px-6 py-6 space-y-4">
              {startSession.isError && (
                <p className="text-sm text-destructive">{getErrorMessage(startSession.error)}</p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="chat-name">Your name</Label>
                <Input id="chat-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chat-email">Email (optional)</Label>
                <Input
                  id="chat-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={320}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chat-message">How can we help?</Label>
                <Textarea
                  id="chat-message"
                  rows={4}
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                  maxLength={4000}
                />
              </div>
              <LoadingButton
                type="button"
                className="w-full"
                disabled={!name.trim() || !firstMessage.trim()}
                isPending={startSession.isPending}
                loadingText="Starting…"
                onClick={handleStart}
              >
                Start chat
              </LoadingButton>
            </div>
          ) : (
            <div className="flex flex-col h-[480px]">
              <ScrollArea
                hideScrollbar
                className="flex-1 min-h-0"
                viewportRef={scrollRef}
                viewportClassName="px-4 py-4"
              >
                <div className="space-y-2">
                {sessionQuery.isLoading && messages.length === 0 ? (
                  <div className="space-y-2">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : sessionQuery.isError ? (
                  <p className="text-sm text-destructive text-center py-8">
                    This chat session is unavailable. Refresh to start a new one.
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                        message.authorId
                          ? "bg-muted text-foreground mr-auto"
                          : "bg-primary text-primary-foreground ml-auto",
                      )}
                    >
                      {message.body}
                    </div>
                  ))
                )}
                </div>
              </ScrollArea>
              <div className="border-t border-border/60 p-3 flex items-end gap-2">
                <Textarea
                  rows={1}
                  placeholder="Type a message..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleDraftKeyDown}
                  maxLength={4000}
                  className="resize-none min-h-[38px]"
                />
                <LoadingButton
                  type="button"
                  size="icon"
                  disabled={!draft.trim()}
                  isPending={sendMessage.isPending}
                  onClick={handleSend}
                >
                  <Send className="h-4 w-4" />
                </LoadingButton>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
