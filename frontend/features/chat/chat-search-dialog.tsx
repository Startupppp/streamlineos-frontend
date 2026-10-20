"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { Hash, Loader2, MessageSquare, Search } from "lucide-react";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { getInitials } from "@/lib/format-utils";
import {
  useSearchMessages,
  useSearchChannels,
  useSearchUsers,
} from "@/hooks/api/chat-search";
import { usePublicChannels } from "@/hooks/api/chat-core-read";
import {
  useCreateDMChannel,
  useJoinChannel,
} from "@/hooks/api/chat-core-mutations-b";
import type { SearchMessagesResult } from "@/types/chat";
import { formatMessageTime } from "./chat-helpers";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ChatDialogHeader } from "./chat-dialog-header";
import {
  CHAT_SEARCH_SCOPES,
  chatSearchScopeLabel,
  readChatSearchScope,
  type ChatSearchScope,
} from "./chat-search-scope";

type MessageResult = SearchMessagesResult["results"][number];

interface ChannelOption {
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

interface ChatSearchDialogProps {
  scope: ChatSearchScope;
  onScopeChange: (scope: ChatSearchScope) => void;
  onOpenChange: (open: boolean) => void;
  onSelectChannel: (channelId: number) => void;
  onOpenMessage: (channelId: number, messageId: number) => void;
}

const RESULT_ROW_CLASS =
  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-50";

export function ChatSearchDialog({
  scope,
  onScopeChange,
  onOpenChange,
  onSelectChannel,
  onOpenMessage,
}: ChatSearchDialogProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const trimmedQuery = debouncedQuery.trim();
  const browsingChannels = scope === "channels" && trimmedQuery.length === 0;

  const messageSearch = useSearchMessages(debouncedQuery, scope === "messages");
  const channelSearch = useSearchChannels(
    debouncedQuery,
    scope === "channels" && !browsingChannels,
  );
  const peopleSearch = useSearchUsers(debouncedQuery, scope === "people");
  const publicChannels = usePublicChannels(browsingChannels);
  const joinChannel = useJoinChannel();
  const createDM = useCreateDMChannel();
  const isOpening = joinChannel.isPending || createDM.isPending;

  const handleQueryChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value),
    [],
  );

  const handleTabChange = useCallback(
    (value: string) => {
      const next = readChatSearchScope(value);
      if (next) onScopeChange(next);
    },
    [onScopeChange],
  );

  const handlePickChannel = useCallback(
    async (channel: ChannelOption) => {
      if (!channel.isMember) {
        try {
          await joinChannel.mutateAsync(channel.id);
        } catch (error) {
          toast.error(getErrorMessage(error));
          return;
        }
      }
      onSelectChannel(channel.id);
    },
    [joinChannel, onSelectChannel],
  );

  const handlePickPerson = useCallback(
    async (userId: string) => {
      try {
        const channel = await createDM.mutateAsync({ targetUserId: userId });
        onSelectChannel(channel.id);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [createDM, onSelectChannel],
  );

  const minLength = scope === "messages" ? 2 : 1;
  const isSearching =
    (scope === "messages" && messageSearch.isLoading) ||
    (scope === "channels" && (channelSearch.isLoading || publicChannels.isLoading)) ||
    (scope === "people" && peopleSearch.isLoading);

  let body: React.ReactNode;
  if (browsingChannels) {
    body = publicChannels.isError ? (
      <ResultNotice text="Channels could not be loaded. Please try again." />
    ) : publicChannels.channels.length === 0 && !publicChannels.isLoading ? (
      <ResultNotice text="No public channels yet" />
    ) : (
      <>
        {publicChannels.channels.map((channel) => (
          <ChannelResultRow
            key={channel.id}
            channel={channel}
            disabled={isOpening}
            onPick={handlePickChannel}
          />
        ))}
        <InfiniteScrollSentinel
          hasNextPage={publicChannels.hasMore}
          isFetchingNextPage={publicChannels.isFetchingNextPage}
          onLoadMore={publicChannels.loadMore}
          label="Load more channels"
        />
      </>
    );
  } else if (trimmedQuery.length < minLength) {
    body = (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Search className="mb-2 w-8 opacity-30" aria-hidden="true" />
        <p className="text-xs">Type to search</p>
      </div>
    );
  } else if (scope === "messages") {
    body = messageSearch.isError ? (
      <ResultNotice text="Search failed. Please try again." />
    ) : messageSearch.data?.results.length === 0 ? (
      <ResultNotice text="No messages found" />
    ) : (
      messageSearch.data?.results.map((message) => (
        <MessageResultRow key={message.id} message={message} onPick={onOpenMessage} />
      ))
    );
  } else if (scope === "channels") {
    body = channelSearch.isError ? (
      <ResultNotice text="Search failed. Please try again." />
    ) : channelSearch.data?.length === 0 ? (
      <ResultNotice text="No channels found" />
    ) : (
      channelSearch.data?.map((channel) => (
        <ChannelResultRow
          key={channel.id}
          channel={channel}
          disabled={isOpening}
          onPick={handlePickChannel}
        />
      ))
    );
  } else {
    body = peopleSearch.isError ? (
      <ResultNotice text="Search failed. Please try again." />
    ) : peopleSearch.data?.length === 0 ? (
      <ResultNotice text="No people found" />
    ) : (
      peopleSearch.data?.map((person) => (
        <PersonResultRow
          key={person.id}
          person={person}
          disabled={isOpening}
          onPick={handlePickPerson}
        />
      ))
    );
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] p-0 gap-0">
        <ChatDialogHeader
          title="Search chat"
          description="Search messages, channels, and people."
        />
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 transition-colors focus-within:border-primary/50">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              value={query}
              onChange={handleQueryChange}
              placeholder="Search messages, channels, people..."
              aria-label="Search terms"
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
            {isSearching && (
              <>
                <Loader2
                  className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
                <span role="status" className="sr-only">
                  Searching…
                </span>
              </>
            )}
          </div>
        </div>

        <Tabs value={scope} onValueChange={handleTabChange} className="mt-3 gap-0 px-4">
          <TabsList aria-label="Search in">
            {CHAT_SEARCH_SCOPES.map((option) => (
              <TabsTrigger key={option} value={option}>
                {chatSearchScopeLabel(option)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="max-h-[400px] overflow-y-auto py-2" aria-busy={isOpening}>
          {body}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultNotice({ text }: { text: string }) {
  return <p className="py-8 text-center text-xs text-muted-foreground">{text}</p>;
}

function MessageResultRow({
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

function ChannelResultRow({
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

function PersonResultRow({
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
