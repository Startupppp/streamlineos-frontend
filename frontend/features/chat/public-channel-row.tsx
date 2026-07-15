"use client";

import { useCallback } from "react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Globe, Hash, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicChannel } from "@/types/chat";

export function PublicChannelRow({
  channel,
  onJoin,
  onLeave,
  joiningId,
  leavingId,
  onSelect,
}: {
  channel: PublicChannel;
  onJoin: (id: number) => void;
  onLeave: (id: number) => void;
  joiningId: number | null;
  leavingId: number | null;
  onSelect: (id: number) => void;
}) {
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
          <LoadingButton
            variant="outline"
            size="sm"
            className="text-[12px]"
            onClick={(e) => { e.stopPropagation(); handleLeave(); }}
            isPending={leavingId === channel.id}
            loadingText="Leaving…"
          >
            Leave
          </LoadingButton>
        ) : (
          <LoadingButton
            size="sm"
            className="text-[12px]"
            onClick={(e) => { e.stopPropagation(); handleJoin(); }}
            isPending={joiningId === channel.id}
            loadingText="Joining…"
          >
            Join
          </LoadingButton>
        )}
      </div>
    </div>
  );
}
