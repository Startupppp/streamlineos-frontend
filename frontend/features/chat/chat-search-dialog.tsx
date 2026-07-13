"use client";

import { useState, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Hash, Loader2, MessageSquare, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchMessages, useSearchChannels, useSearchUsers } from "@/hooks/api";
import { formatMessageTime } from "./chat-helpers";

interface ChatSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectChannel: (channelId: number) => void;
}

export function ChatSearchDialog({ open, onOpenChange, onSelectChannel }: ChatSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"messages" | "channels" | "people">("messages");
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: messageResults, isLoading: loadingMessages } = useSearchMessages(debouncedQuery, open && tab === "messages");
  const { data: channelResults, isLoading: loadingChannels } = useSearchChannels(debouncedQuery, open && tab === "channels");
  const { data: userResults, isLoading: loadingUsers } = useSearchUsers(debouncedQuery, open && tab === "people");

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value), []);

  const handleSelectChannel = useCallback((id: number) => {
    onSelectChannel(id);
    onOpenChange(false);
    setQuery("");
  }, [onSelectChannel, onOpenChange]);

  const isLoading = (tab === "messages" && loadingMessages) || (tab === "channels" && loadingChannels) || (tab === "people" && loadingUsers);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 focus-within:border-primary/50 transition-colors">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={handleQueryChange}
              placeholder="Search messages, channels, people..."
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />}
          </div>
        </DialogHeader>

        <div className="flex border-b border-border/40 px-4 mt-3">
          {(["messages", "channels", "people"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-2 text-[12px] font-semibold capitalize border-b-2 transition-colors -mb-px",
                tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="max-h-[400px] overflow-y-auto py-2">
          {debouncedQuery.trim().length < (tab === "messages" ? 2 : 1) ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-[12px]">Type to search</p>
            </div>
          ) : tab === "messages" ? (
            messageResults?.results.length === 0 ? (
              <p className="text-center text-[12px] text-muted-foreground py-8">No messages found</p>
            ) : (
              messageResults?.results.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => msg.channel?.id && handleSelectChannel(msg.channel.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/40 text-left transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-bold text-foreground">{msg.sender?.name}</span>
                      <span className="text-[10px] text-muted-foreground">in #{msg.channel?.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{formatMessageTime(msg.createdAt)}</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground truncate">{msg.content}</p>
                  </div>
                </button>
              ))
            )
          ) : tab === "channels" ? (
            channelResults?.length === 0 ? (
              <p className="text-center text-[12px] text-muted-foreground py-8">No channels found</p>
            ) : (
              channelResults?.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => handleSelectChannel(ch.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 text-left transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">{ch.name}</p>
                    {ch.description && <p className="text-[11px] text-muted-foreground truncate">{ch.description}</p>}
                  </div>
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", ch.isMember ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground")}>
                    {ch.isMember ? "Joined" : "Join"}
                  </span>
                </button>
              ))
            )
          ) : (
            userResults?.length === 0 ? (
              <p className="text-center text-[12px] text-muted-foreground py-8">No people found</p>
            ) : (
              userResults?.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="h-8 w-8 border border-border/30">
                    <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground">
                      {u.name?.slice(0, 2).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              ))
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
