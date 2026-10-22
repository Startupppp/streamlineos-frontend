"use client";

import { useCallback } from "react";
import { Hash, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials } from "@/lib/format-utils";
import type { SearchMessagesResult } from "@/types/chat";
import { formatMessageTime } from "./chat-helpers";

type MessageResult = SearchMessagesResult["results"][number];

export interface ChannelOption {
  id: number;
  name: string | null;
  description: string | null;
  isMember: boolean;
}

interface PersonOption {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

const RESULT_ROW_CLASS =
  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-50";

export function ResultNotice({ text }: { text: string }) {
  return <p className="py-8 text-center text-xs text-muted-foreground">{text}</p>;
}

export function MessageResultRow({
  message,
  onPick,
}: {
  message: MessageResult;
  onPick: (channelId: number, messageId: number) => void;
}) {
  const handleClick = useCallback(
    () => onPick(message.channelId, message.id),
    [message.channelId, message.id, onPick],
  );
  return (
    <button type="button" onClick={handleClick} className={cn(RESULT_ROW_CLASS, "items-start")}>
      <div className="mt-0.5 flex w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex min-w-0 items-center gap-2">
          <span className="shrink truncate text-dense font-bold text-foreground">
            {message.sender?.name}
          </span>
          <span className="min-w-0 shrink truncate text-micro text-muted-foreground">
            in #{message.channel?.name}
          </span>
          <span className="ml-auto shrink-0 whitespace-nowrap text-micro text-muted-foreground">
            {formatMessageTime(message.createdAt)}
          </span>
        </div>
        <TruncatedText text={message.content ?? ""} className="text-xs text-muted-foreground" />
      </div>
    </button>
  );
}

export function ChannelResultRow({
  channel,
  disabled,
  onPick,
}: {
  channel: ChannelOption;
  disabled: boolean;
  onPick: (channel: ChannelOption) => void;
}) {
  const handleClick = useCallback(() => onPick(channel), [channel, onPick]);
  const name = channel.name ?? "Untitled channel";
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={channel.isMember ? `Open ${name}` : `Join and open ${name}`}
      className={RESULT_ROW_CLASS}
    >
      <div className="flex w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Hash className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <TruncatedText text={name} className="text-label font-semibold text-foreground" />
        {channel.description && (
          <TruncatedText text={channel.description} className="text-dense text-muted-foreground" />
        )}
      </div>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-dense font-medium",
          channel.isMember
            ? "bg-status-success-surface text-status-success-ink"
            : "bg-muted text-muted-foreground",
        )}
      >
        {channel.isMember ? "Joined" : "Join"}
      </span>
    </button>
  );
}

export function PersonResultRow({
  person,
  disabled,
  onPick,
}: {
  person: PersonOption;
  disabled: boolean;
  onPick: (userId: string) => void;
}) {
  const handleClick = useCallback(() => onPick(person.id), [person.id, onPick]);
  const name = person.name ?? person.email;
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Message ${name}`}
      className={RESULT_ROW_CLASS}
    >
      <Avatar className="h-8 w-8 border border-border/30">
        <AvatarImage src={resolveImageUrl(person.image)} />
        <AvatarFallback className="bg-muted text-micro font-bold text-muted-foreground">
          {getInitials(person.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <TruncatedText text={name} className="text-label font-semibold text-foreground" />
        <TruncatedText text={person.email} className="text-dense text-muted-foreground" />
      </div>
    </button>
  );
}
