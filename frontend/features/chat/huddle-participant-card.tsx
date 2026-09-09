"use client";

import { UserMinusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { HuddleParticipant } from "@/types/chat";
import { getInitials } from "@/lib/format-utils";

interface HuddleParticipantCardProps {
  participant: HuddleParticipant;
  isCurrentUser: boolean;
  isHost: boolean;
  onKick?: () => void;
}

export function HuddleParticipantCard({
  participant,
  isCurrentUser,
  isHost,
  onKick,
}: HuddleParticipantCardProps) {
  const { iconRef: kickIconRef, hoverHandlers: kickHoverHandlers } = useAnimatedIcon();

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-muted/30">
      <Avatar className="h-10 w-10 border-2 border-transparent">
        <AvatarImage src={resolveImageUrl(participant.user?.image)} />
        <AvatarFallback className="text-dense font-semibold">
          {getInitials(participant.user?.name)}
        </AvatarFallback>
      </Avatar>
      <TruncatedText
        text={isCurrentUser ? "You" : (participant.user?.name ?? "Unknown")}
        className="text-dense text-center w-full leading-tight"
      />
      {isHost && !isCurrentUser && onKick && (
        <button
          type="button"
          onClick={onKick}
          {...kickHoverHandlers}
          className="text-micro text-status-danger-ink hover:text-status-danger-ink transition-colors flex items-center gap-0.5"
          aria-label="Remove from huddle"
        >
          <UserMinusIcon ref={kickIconRef} size={10} />
          Remove
        </button>
      )}
    </div>
  );
}
