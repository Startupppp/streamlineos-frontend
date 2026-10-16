"use client";

import { Loader2 } from "lucide-react";
import { UserMinusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { resolveImageUrl } from "@/lib/utils";
import type { ChannelMember } from "@/types/chat";
import { TruncatedText } from "@/components/ui/truncated-text";
import { FLEX_TITLE_SLOT } from "@/lib/text-overflow";
import { getInitials } from "@/lib/format-utils";

const RemoveMemberButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { isRemoving: boolean }
>(function RemoveMemberButton({ isRemoving, className, ...props }, ref) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button ref={ref} {...hoverHandlers} className={className} {...props}>
      {isRemoving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <UserMinusIcon ref={iconRef} size={14} />
      )}
    </button>
  );
});

export function ChannelMemberRow({
  member,
  isOnline,
  currentUserId,
  isAdmin,
  isMultiMemberChannel,
  isRemoving,
  onRemove,
  isChangingRole,
  onChangeRole,
}: {
  member: ChannelMember;
  isOnline: boolean;
  currentUserId: string;
  isAdmin: boolean | undefined;
  isMultiMemberChannel: boolean;
  isRemoving: boolean;
  onRemove: (userId: string, userName: string | null | undefined, isYou: boolean) => void;
  isChangingRole: boolean;
  onChangeRole: (userId: string, role: ChannelMember["role"], userName: string | null | undefined) => void;
}) {
  const isYou = member.user?.id === currentUserId;
  const canRemove = isMultiMemberChannel && ((isAdmin && !isYou) || isYou);
  // Self-demotion is left out: it can strand a channel with no admin.
  const canChangeRole = Boolean(isAdmin) && isMultiMemberChannel && !isYou && Boolean(member.user?.id);
  const nextRole: ChannelMember["role"] = member.role === "ADMIN" ? "MEMBER" : "ADMIN";
  const handleChangeRole = () => onChangeRole(member.user?.id ?? "", nextRole, member.user?.name);

  return (
    <div className="flex min-w-0 items-center gap-2.5 overflow-hidden px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors group">
      <div className="relative shrink-0">
        <Avatar className="w-8">
          <AvatarImage src={resolveImageUrl(member.user?.image)} />
          <AvatarFallback className="text-micro font-medium">
            {getInitials(member.user?.name)}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-status-success-fill border-2 border-background" />
        )}
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 items-center gap-1 overflow-hidden">
          <div className={FLEX_TITLE_SLOT}>
            <TruncatedText
              text={member.user?.name ?? ""}
              className="w-full text-label font-medium"
            />
          </div>
          {isYou ? (
            <span className="shrink-0 text-label font-normal text-muted-foreground">(you)</span>
          ) : null}
        </div>
        <TruncatedText
          text={member.user?.email ?? ""}
          className="w-full text-dense text-muted-foreground"
        />
      </div>
      {member.role === "ADMIN" && (
        <Badge variant="outline" className="shrink-0 text-micro px-1.5 py-0 h-4 border-primary/30 text-primary">
          Admin
        </Badge>
      )}
      {canChangeRole && (
        <button
          type="button"
          onClick={handleChangeRole}
          disabled={isChangingRole}
          className="shrink-0 rounded-md px-1.5 py-0.5 text-micro font-medium text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50"
          aria-label={
            nextRole === "ADMIN"
              ? `Make ${member.user?.name ?? "member"} an admin`
              : `Remove admin from ${member.user?.name ?? "member"}`
          }
        >
          {nextRole === "ADMIN" ? "Make admin" : "Remove admin"}
        </button>
      )}
      {canRemove && (
        <RemoveMemberButton
          type="button"
          isRemoving={isRemoving}
          onClick={() => onRemove(member.user?.id ?? "", member.user?.name, isYou)}
          disabled={isRemoving}
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          title={isYou ? "Leave channel" : "Remove member"}
          aria-label={isYou ? "Leave channel" : `Remove ${member.user?.name ?? "member"}`}
        />
      )}
    </div>
  );
}
