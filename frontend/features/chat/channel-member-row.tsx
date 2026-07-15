"use client";

import { Loader2, MicOff, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { resolveImageUrl } from "@/lib/utils";
import { getInitials } from "./chat-helpers";
import type { ChannelMember } from "@/types/chat";

export function ChannelMemberRow({
  member,
  isOnline,
  isMutedInCall,
  currentUserId,
  isAdmin,
  isMultiMemberChannel,
  isRemoving,
  onRemove,
}: {
  member: ChannelMember;
  isOnline: boolean;
  isMutedInCall: boolean;
  currentUserId: string;
  isAdmin: boolean | undefined;
  isMultiMemberChannel: boolean;
  isRemoving: boolean;
  onRemove: (userId: string, userName: string | null | undefined, isYou: boolean) => void;
}) {
  const isYou = member.user?.id === currentUserId;
  const canRemove = isMultiMemberChannel && ((isAdmin && !isYou) || isYou);

  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors group">
      <div className="relative shrink-0">
        <Avatar className="w-8">
          <AvatarImage src={resolveImageUrl(member.user?.image)} />
          <AvatarFallback className="text-[10px] font-medium">
            {getInitials(member.user?.name)}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
        )}
        {isMutedInCall && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-muted-foreground/80 border-2 border-background flex items-center justify-center">
            <MicOff className="h-2 w-2 text-background" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate">
          {member.user?.name}
          {isYou && <span className="text-muted-foreground font-normal"> (you)</span>}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{member.user?.email}</p>
      </div>
      {member.role === "ADMIN" && (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary">
          Admin
        </Badge>
      )}
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(member.user?.id ?? "", member.user?.name, isYou)}
          disabled={isRemoving}
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          title={isYou ? "Leave channel" : "Remove member"}
          aria-label={isYou ? "Leave channel" : `Remove ${member.user?.name ?? "member"}`}
        >
          {isRemoving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserMinus className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
