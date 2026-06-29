"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  useMessageThreads,
  useCandidateMessages,
  useSendCandidateMessage,
} from "@/hooks/hooks/hr/recruitment";
import type {
  MessageThread,
  CandidateMessage,
  MessageChannel,
} from "@/hooks/hooks/hr/recruitment";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
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

function candidateName(thread: MessageThread | CandidateMessage): string {
  const first = thread.candidateFirstName ?? "";
  const last = thread.candidateLastName ?? "";
  const full = [first, last].filter(Boolean).join(" ");
  return full || (thread.candidateEmail ?? "Unknown");
}

function ThreadItem({
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
      onClick={handleClick}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-lg transition-colors hover:bg-muted/60",
        isActive && "bg-muted",
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="text-sm font-medium truncate">
          {candidateName(thread)}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {thread.unreadCount > 0 && (
            <Badge
              variant="default"
              className="h-4 min-w-4 px-1 text-[9px] rounded-full"
            >
              {thread.unreadCount}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(thread.lastMessageAt), "MMM d")}
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

function MessageBubble({ msg }: { msg: CandidateMessage }) {
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
            "text-[10px] mt-1 opacity-60",
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

function ComposeBar({
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
    <div className="border-t p-3 space-y-2 bg-background">
      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">Channel</Label>
          <Select value={channel} onValueChange={handleChannelChange}>
            <SelectTrigger className="h-7 text-xs">
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
              className="h-7 text-xs"
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
        <Button
          size="sm"
          className="self-end shrink-0"
          onClick={handleSend}
          disabled={!body.trim() || send.isPending}
        >
          {send.isPending ? "Sending..." : "Send"}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">Cmd+Enter to send</p>
    </div>
  );
}

function ThreadPane({ thread }: { thread: MessageThread }) {
  const { data: messages = [], isLoading } = useCandidateMessages(
    thread.candidateId,
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 bg-background">
        <p className="text-sm font-semibold">{candidateName(thread)}</p>
        <p className="text-xs text-muted-foreground">{thread.candidateEmail}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No messages yet.
          </p>
        ) : (
          [...messages]
            .reverse()
            .map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>
      <ComposeBar
        candidateId={thread.candidateId}
        candidateEmail={thread.candidateEmail}
      />
    </div>
  );
}

export default function InboxPage() {
  const { data: threads = [], isLoading } = useMessageThreads();
  const [activeThread, setActiveThread] = useState<MessageThread | null>(null);

  const handleSelectThread = useCallback(
    (t: MessageThread) => setActiveThread(t),
    [],
  );

  if (isLoading) {
    return (
      <PageWrapper title="Candidate Inbox" subtitle="Messages with candidates">
        <div className="flex gap-4 h-[calc(100vh-12rem)]">
          <div className="w-72 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          <Skeleton className="flex-1 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Candidate Inbox"
      subtitle="Manage candidate conversations across channels"
    >
      {threads.length === 0 ? (
        <EmptyState
          illustration={<EmptyInboxIllustration />}
          title="No messages yet"
          description="Send the first message to a candidate from their profile page."
        />
      ) : (
        <div
          className="flex gap-0 border rounded-xl overflow-hidden"
          style={{ height: "calc(100vh - 13rem)" }}
        >
          <div className="w-72 border-r flex flex-col shrink-0">
            <div className="px-3 py-2 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {threads.length} Conversations
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {threads.map((t) => (
                <ThreadItem
                  key={t.candidateId}
                  thread={t}
                  isActive={activeThread?.candidateId === t.candidateId}
                  onSelect={handleSelectThread}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {activeThread ? (
              <ThreadPane thread={activeThread} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a conversation to view messages
              </div>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
