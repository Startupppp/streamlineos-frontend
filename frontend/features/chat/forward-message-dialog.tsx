"use client";

import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Hash, Loader2, MessageSquare, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useChatChannels, useSendMessage } from "@/lib/api/hooks";
import type { Channel } from "@/types/chat";

interface ForwardableMessage {
  content: string | null;
}

interface ForwardMessageDialogProps {
  message: ForwardableMessage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForwardMessageDialog({ message, open, onOpenChange }: ForwardMessageDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const { data: channels } = useChatChannels(open);
  const sendMessage = useSendMessage();

  const filteredChannels = useMemo(() => {
    if (!channels) return [];
    const q = query.toLowerCase();
    return channels.filter(c =>
      !q || c.name?.toLowerCase().includes(q) || c.type === "DIRECT"
    ).slice(0, 20);
  }, [channels, query]);

  const handleForward = useCallback(async () => {
    if (!message || !selectedChannelId) return;
    const content = comment.trim()
      ? `${comment.trim()}\n\n> ${message.content ?? "[attachment]"}`
      : `> ${message.content ?? "[attachment]"}`;
    try {
      await sendMessage.mutateAsync({ channelId: selectedChannelId, content });
      toast.success("Message forwarded");
      onOpenChange(false);
      setQuery("");
      setSelectedChannelId(null);
      setComment("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [message, selectedChannelId, comment, sendMessage, onOpenChange]);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value), []);
  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setComment(e.target.value), []);

  const getChannelLabel = useCallback((c: Channel) => {
    if (c.type === "DIRECT") {
      return c.members?.find(() => true)?.user?.name ?? "Direct Message";
    }
    return c.name ?? "Channel";
  }, []);

  const getChannelIcon = useCallback((c: Channel) => {
    if (c.type === "DIRECT") return <MessageSquare className="h-3.5 w-3.5" />;
    if (c.type === "GROUP") return <Users className="h-3.5 w-3.5" />;
    return <Hash className="h-3.5 w-3.5" />;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold">Forward Message</DialogTitle>
        </DialogHeader>

        {message?.content && (
          <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground line-clamp-2">
            {message.content}
          </div>
        )}

        <div className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={handleQueryChange}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-[13px] focus:outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="max-h-[220px] overflow-y-auto rounded-lg border border-border/40 divide-y divide-border/20">
          {filteredChannels.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedChannelId(c.id === selectedChannelId ? null : c.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                selectedChannelId === c.id ? "bg-blue-500/10" : "hover:bg-muted/40",
              )}
            >
              <div className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-muted-foreground",
                selectedChannelId === c.id ? "bg-blue-500/15 text-blue-600" : "bg-muted",
              )}>
                {getChannelIcon(c)}
              </div>
              <span className="text-[13px] font-medium flex-1 truncate">{getChannelLabel(c)}</span>
              {selectedChannelId === c.id && (
                <div className="h-4 w-4 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                </div>
              )}
            </button>
          ))}
          {filteredChannels.length === 0 && (
            <div className="py-6 text-center text-[12px] text-muted-foreground">No conversations found</div>
          )}
        </div>

        <input
          value={comment}
          onChange={handleCommentChange}
          placeholder="Add a comment (optional)"
          className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500/40 transition-colors placeholder:text-muted-foreground"
        />

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            disabled={!selectedChannelId || sendMessage.isPending}
            onClick={handleForward}
          >
            {sendMessage.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Forward
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
