"use client";

import { Mic, MicOff, Hand, Monitor } from "lucide-react";
import { UserMinusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { HuddleParticipant } from "@/types/chat";
import { getInitials } from "./chat-helpers";
import { useNetworkQuality } from "./use-network-quality";

interface HuddleParticipantCardProps {
  participant: HuddleParticipant;
  audioLevel: number;
  isCurrentUser: boolean;
  isHost: boolean;
  onKick?: () => void;
  peerConnection: RTCPeerConnection | null;
}

export function HuddleParticipantCard({
  participant,
  audioLevel,
  isCurrentUser,
  isHost,
  onKick,
  peerConnection,
}: HuddleParticipantCardProps) {
  const isSpeaking = audioLevel > 0.05;
  const networkQuality = useNetworkQuality(peerConnection);
  const { iconRef: kickIconRef, hoverHandlers: kickHoverHandlers } = useAnimatedIcon();
  const qualityColor =
    networkQuality === "excellent"
      ? "bg-status-success-fill"
      : networkQuality === "good"
        ? "bg-status-warning-fill"
        : networkQuality === "poor"
          ? "bg-status-danger-fill"
          : "bg-status-neutral-fill";

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-muted/30">
      <div className="relative">
        {!isCurrentUser && (
          <span className={cn("absolute -top-1 -right-1 h-2 w-2 rounded-full z-10", qualityColor)} />
        )}
        <Avatar
          className={cn(
            "h-10 w-10 border-2 transition-colors",
            isSpeaking ? "border-status-success-rule" : "border-transparent",
          )}
        >
          <AvatarImage src={resolveImageUrl(participant.user?.image)} />
          <AvatarFallback className="text-dense font-semibold">
            {getInitials(participant.user?.name)}
          </AvatarFallback>
        </Avatar>
        {participant.isMuted && (
          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-background border border-border flex items-center justify-center">
            <MicOff className="h-2.5 w-2.5 text-muted-foreground" />
          </span>
        )}
        {!participant.isMuted && isSpeaking && (
          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-status-success-surface border border-border flex items-center justify-center">
            <Mic className="h-2.5 w-2.5 text-status-success-ink" />
          </span>
        )}
        {participant.handRaised && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-status-warning-surface border border-border flex items-center justify-center text-micro">
            <Hand className="h-2.5 w-2.5 text-status-warning-ink" />
          </span>
        )}
        {participant.isScreenSharing && (
          <span className="absolute -bottom-0.5 -left-0.5 h-4 w-4 rounded-full bg-primary/10 border border-border flex items-center justify-center">
            <Monitor className="h-2.5 w-2.5 text-primary" />
          </span>
        )}
      </div>
      <TruncatedText
        text={isCurrentUser ? "You" : (participant.user?.name ?? "Unknown")}
        className="text-dense text-center w-full leading-tight"
      />
      {isHost && !isCurrentUser && onKick && (
        <button
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
