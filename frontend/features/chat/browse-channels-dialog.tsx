"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Hash, Loader2, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePublicChannels, useJoinChannel, useLeaveChannel } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import type { PublicChannel } from "@/types/chat";

interface PublicChannelRowProps {
  channel: PublicChannel;
  onJoin: (id: number) => void;
  onLeave: (id: number) => void;
  joiningId: number | null;
  leavingId: number | null;
  onSelect: (id: number) => void;
}

function PublicChannelRow({ channel, onJoin, onLeave, joiningId, leavingId, onSelect }: PublicChannelRowProps) {
  const handleJoin = useCallback(() => onJoin(channel.id), [channel.id, onJoin]);
  const handleLeave = useCallback(() => onLeave(channel.id), [channel.id, onLeave]);
  const handleRowClick = useCallback(() => {
    if (channel.isMember) onSelect(channel.id);
  }, [channel.id, channel.isMember, onSelect]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/30 transition-colors",
        channel.isMember && "cursor-pointer"
      )}
      onClick={handleRowClick}
    >
      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 flex items-center justify-center border border-border/40 shrink-0">
        <Hash className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate">{channel.name}</p>
        {channel.description && (
          <p className="text-[11px] text-muted-foreground truncate">{channel.description}</p>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          <Users className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-[11px] text-muted-foreground/60">{channel.memberCount} member{channel.memberCount !== 1 ? "s" : ""}</span>
          <Globe className="h-3 w-3 text-muted-foreground/50 ml-2" />
          <span className="text-[11px] text-muted-foreground/60">Public</span>
        </div>
      </div>
      <div className="shrink-0">
        {channel.isMember ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[12px]"
            onClick={(e) => { e.stopPropagation(); handleLeave(); }}
            disabled={leavingId === channel.id}
          >
            {leavingId === channel.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Leave"}
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-7 text-[12px]"
            onClick={(e) => { e.stopPropagation(); handleJoin(); }}
            disabled={joiningId === channel.id}
          >
            {joiningId === channel.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Join"}
          </Button>
        )}
      </div>
    </div>
  );
}

export function BrowseChannelsDialog({
  open,
  onOpenChange,
  onSelectChannel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectChannel: (id: number) => void;
}) {
  const { data: publicChannels, isLoading } = usePublicChannels(open);
  const joinChannel = useJoinChannel();
  const leaveChannel = useLeaveChannel();
  const [search, setSearch] = useState("");
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [leavingId, setLeavingId] = useState<number | null>(null);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);

  const filtered = useMemo(() => {
    if (!publicChannels) return [];
    if (!search) return publicChannels;
    const q = search.toLowerCase();
    return publicChannels.filter(
      (ch) => ch.name.toLowerCase().includes(q) || ch.description?.toLowerCase().includes(q)
    );
  }, [publicChannels, search]);

  const handleJoin = useCallback(async (channelId: number) => {
    setJoiningId(channelId);
    try {
      await joinChannel.mutateAsync(channelId);
      toast.success("Joined channel");
      onSelectChannel(channelId);
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setJoiningId(null);
    }
  }, [joinChannel, onSelectChannel, onOpenChange]);

  const handleLeave = useCallback(async (channelId: number) => {
    setLeavingId(channelId);
    try {
      await leaveChannel.mutateAsync(channelId);
      toast.success("Left channel");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLeavingId(null);
    }
  }, [leaveChannel]);

  const handleSelect = useCallback((channelId: number) => {
    onSelectChannel(channelId);
    onOpenChange(false);
  }, [onSelectChannel, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/30">
          <DialogTitle className="text-[16px]">Browse Public Channels</DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="Search channels..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9 h-9 bg-muted/30 border-border/30"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[400px] px-2 pb-4">
          {isLoading ? (
            <div className="space-y-2 px-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  <Skeleton className="h-7 w-14 rounded-md" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Globe className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-[13px] text-muted-foreground font-medium">
                {search ? "No channels match your search" : "No public channels yet"}
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-1">
                {search ? "Try a different search term" : "Create a public channel to get started"}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((ch) => (
                <PublicChannelRow
                  key={ch.id}
                  channel={ch}
                  onJoin={handleJoin}
                  onLeave={handleLeave}
                  joiningId={joiningId}
                  leavingId={leavingId}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
