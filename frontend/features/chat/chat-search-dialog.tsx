"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { Loader2, Search } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
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
import { ChatDialogHeader } from "./chat-dialog-header";
import {
  ChannelResultRow,
  MessageResultRow,
  PersonResultRow,
  ResultNotice,
  type ChannelOption,
} from "./chat-search-result-rows";
import {
  CHAT_SEARCH_SCOPES,
  chatSearchScopeLabel,
  readChatSearchScope,
  type ChatSearchScope,
} from "./chat-search-scope";

interface ChatSearchDialogProps {
  scope: ChatSearchScope;
  onScopeChange: (scope: ChatSearchScope) => void;
  onOpenChange: (open: boolean) => void;
  onSelectChannel: (channelId: number) => void;
  onOpenMessage: (channelId: number, messageId: number) => void;
}

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
