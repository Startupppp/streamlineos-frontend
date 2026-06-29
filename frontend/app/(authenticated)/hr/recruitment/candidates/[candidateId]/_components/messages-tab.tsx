"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useCandidateMessages, useSendCandidateMessage } from "@/hooks/api/hr/recruitment";
import type { CandidateMessage, MessageChannel } from "@/hooks/api/hr/recruitment";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

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
        <p className={cn("text-[10px] mt-1 opacity-60", isOutbound ? "text-right" : "text-left")}>
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
  const { data: messages = [], isLoading } = useCandidateMessages(candidateId);
  const send = useSendCandidateMessage();
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [channel, setChannel] = useState<MessageChannel>("EMAIL");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
        ) : (
          [...messages].reverse().map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as MessageChannel)}>
              <SelectTrigger className="h-7 text-xs">
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
                className="h-7 text-xs"
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
