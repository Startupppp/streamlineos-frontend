"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useCandidateMessages, useSendCandidateMessage } from "@/hooks/api/hr/recruitment";
import type { CandidateMessage, MessageChannel } from "@/hooks/api/hr/recruitment";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { WhatsappConsentPanel } from "./whatsapp-consent-panel";

const MESSAGE_CHANNELS = [
  "EMAIL",
  "WHATSAPP",
  "IN_APP",
] as const satisfies readonly MessageChannel[];

function MessageBubble({ msg }: { msg: CandidateMessage }) {
  const isOutbound = msg.direction === "OUTBOUND";
  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
          isOutbound
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted rounded-bl-sm"
        )}
      >
        {msg.subject && (
          <p className="text-xs font-medium mb-0.5 opacity-75">Re: {msg.subject}</p>
        )}
        <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
        <p className={cn("text-micro mt-1 opacity-60", isOutbound ? "text-right" : "text-left")}>
          {isOutbound ? (msg.senderName ?? "You") : "Candidate"} · {format(new Date(msg.sentAt), "MMM d, h:mm a")}
        </p>
      </div>
    </div>
  );
}

export function MessagesTab({
  candidateId,
  candidateEmail,
}: {
  candidateId: number;
  candidateEmail: string;
}) {
  const messagesQuery = useCandidateMessages(candidateId);
  const messages = messagesQuery.data ?? [];
  const send = useSendCandidateMessage();
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [channel, setChannel] = useState<MessageChannel>("EMAIL");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleChannelChange(v: string) {
    const next = MESSAGE_CHANNELS.find((candidate) => candidate === v);
    if (next) setChannel(next);
  }

  function handleRetryMessages() {
    void messagesQuery.refetch();
  }

  const state = usePageState({
    permission: "hr:requisitions:view",
    isLoading: messagesQuery.isLoading,
    isError: messagesQuery.isError,
    error: messagesQuery.error,
    isEmpty: messages.length === 0,
  });

  const handleSend = useCallback(() => {
    if (!body.trim()) return;
    send.mutate(
      { candidateId, channel, subject: subject.trim() || undefined, body: body.trim() },
      {
        onSuccess: () => {
          setBody("");
          setSubject("");
          toast.success("Message sent");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [body, subject, channel, candidateId, send]);

  return (
    <div className="flex flex-col rounded-xl border bg-card" style={{ minHeight: "400px", maxHeight: "600px" }}>
      <ScrollArea hideScrollbar className="min-h-0 flex-1">
        <div className="overscroll-contain space-y-3 p-4">
        <PageState
          resolution={state}
          onRetry={handleRetryMessages}
          compact
          loading={
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </>
          }
          empty={<p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>}
        >
          <>
            {[...messages].reverse().map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
          </>
        </PageState>
        <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="border-t p-3 space-y-2">
        {/*
          Above the channel selector, because the selector has offered WHATSAPP
          since before anything could deliver one — picking it wrote a message
          row and nothing else, so a recruiter read "sent" while the candidate's
          phone never rang.
        */}
        {channel === "WHATSAPP" && <WhatsappConsentPanel candidateId={candidateId} />}
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Channel</Label>
            <Select
              value={channel}
              onValueChange={handleChannelChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">Email ({candidateEmail})</SelectItem>
                <SelectItem value="IN_APP">In-App</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {channel === "EMAIL" && (
            <div className="flex-[2] space-y-1">
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <Input
                className="text-xs"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Textarea
            rows={2}
            className="text-sm resize-none"
            placeholder="Type a message... (Cmd+Enter to send)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
            }}
          />
          <Button
            size="sm"
            className="self-end shrink-0"
            onClick={handleSend}
            disabled={!body.trim() || send.isPending}
          >
            {send.isPending ? "..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
