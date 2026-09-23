"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useCandidateMessages, useSendCandidateMessage } from "@/hooks/api/hr/recruitment";
import type { MessageThread, CandidateMessage, MessageChannel } from "@/hooks/api/hr/recruitment";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";

export function candidateName(thread: MessageThread | CandidateMessage): string {
  const first = thread.candidateFirstName ?? "";
  const last = thread.candidateLastName ?? "";
  const full = [first, last].filter(Boolean).join(" ");
  return full || (thread.candidateEmail ?? "Unknown");
}

export function ThreadItem({
  thread,
  isActive,
  onSelect,
}: {
  thread: MessageThread;
  isActive: boolean;
  onSelect: (thread: MessageThread) => void;
}) {
  function handleClick() {
    onSelect(thread);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-lg transition-colors hover:bg-muted/60",
        isActive && "bg-muted",
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <TruncatedText text={candidateName(thread)} className="text-sm font-medium" />
        <div className="flex items-center gap-1.5 shrink-0">
          {thread.unreadCount > 0 && (
            <Badge
              variant="default"
              className="h-4 min-w-4 px-1 text-micro rounded-full"
            >
              {thread.unreadCount}
            </Badge>
          )}
          <span className="text-micro text-muted-foreground">
            {thread.lastMessageAt ? format(new Date(thread.lastMessageAt), "MMM d") : ""}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground truncate">
        {thread.lastDirection === "OUTBOUND" ? "You: " : ""}
        {thread.lastBody}
      </p>
    </button>
  );
}

export function MessageBubble({ msg }: { msg: CandidateMessage }) {
  const isOutbound = msg.direction === "OUTBOUND";
  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm",
          isOutbound
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted rounded-bl-sm",
        )}
      >
        {msg.subject && (
          <p className="text-xs font-medium mb-1 opacity-75">
            Re: {msg.subject}
          </p>
        )}
        <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
        <p
          className={cn(
            "text-micro mt-1 opacity-60",
            isOutbound ? "text-right" : "text-left",
          )}
        >
          {isOutbound ? (msg.senderName ?? "You") : candidateName(msg)} ·{" "}
          {format(new Date(msg.sentAt), "h:mm a")}
        </p>
      </div>
    </div>
  );
}

export function ComposeBar({
  candidateId,
  candidateEmail,
}: {
  candidateId: number;
  candidateEmail: string | null;
}) {
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [channel, setChannel] = useState<MessageChannel>("EMAIL");
  const send = useSendCandidateMessage();

  const handleSend = useCallback(() => {
    if (!body.trim()) return;
    send.mutate(
      {
        candidateId,
        channel,
        subject: subject.trim() || undefined,
        body: body.trim(),
      },
      {
        onSuccess: () => {
          setBody("");
          setSubject("");
          toast.success("Message sent");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [body, subject, channel, candidateId, send]);

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setBody(e.target.value);
  }
  function handleSubjectChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSubject(e.target.value);
  }
  function handleChannelChange(v: string) {
    setChannel(v as MessageChannel);
  }
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
  }

  return (
    <div className="border-t p-3 space-y-2 bg-card border-border">
      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">Channel</Label>
          <Select value={channel} onValueChange={handleChannelChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EMAIL">
                Email {candidateEmail ? `(${candidateEmail})` : ""}
              </SelectItem>
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
              onChange={handleSubjectChange}
            />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Textarea
          rows={3}
          className="text-sm resize-none"
          placeholder="Type a message..."
          value={body}
          onChange={handleBodyChange}
          onKeyDown={handleKeyDown}
        />
        <LoadingButton
          size="sm"
          className="self-end shrink-0"
          onClick={handleSend}
          disabled={!body.trim() || send.isPending}
          isPending={send.isPending}
          loadingText="Sending..."
        >
          Send
        </LoadingButton>
      </div>
      <p className="text-micro text-muted-foreground">Cmd+Enter to send</p>
    </div>
  );
}

export function ThreadPane({ thread }: { thread: MessageThread }) {
  const messagesQuery = useCandidateMessages(thread.candidateId);
  const messages = messagesQuery.data ?? [];
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleRetry() {
    void messagesQuery.refetch();
  }

  const state = usePageState({
    permission: "hr:employees:view",
    isLoading: messagesQuery.isLoading,
    isError: messagesQuery.isError,
    error: messagesQuery.error,
    isEmpty: messages.length === 0,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 bg-card border-border">
        <p className="text-sm font-semibold">{candidateName(thread)}</p>
        <p className="text-xs text-muted-foreground">{thread.candidateEmail}</p>
      </div>
      <ScrollArea hideScrollbar className="min-h-0 flex-1">
        <div className="overscroll-contain space-y-3 p-4">
        <PageState
          resolution={state}
          onRetry={handleRetry}
          compact
          loading={
            <>
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </>
          }
          empty={
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages yet.
            </p>
          }
        >
          <>
            {[...messages]
              .reverse()
              .map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
          </>
        </PageState>
        <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <ComposeBar
        candidateId={thread.candidateId}
        candidateEmail={thread.candidateEmail}
      />
    </div>
  );
}
