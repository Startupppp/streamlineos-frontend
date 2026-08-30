"use client";

import { PhoneOff } from "lucide-react";
import { MicIcon, MicOffIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials } from "./chat-helpers";
import type { Huddle } from "@/types/chat";

interface HuddleMiniBarProps {
  participants: Huddle["participants"];
  isMuted: boolean;
  onToggleMute: () => void;
  onLeave: () => void;
  isLeavePending: boolean;
}

export function HuddleMiniBar({
  participants,
  isMuted,
  onToggleMute,
  onLeave,
  isLeavePending,
}: HuddleMiniBarProps) {
  return (
    <div className="px-4 pb-2 flex items-center gap-2">
      <div className="flex -space-x-1.5">
        {participants.slice(0, 4).map((p) => (
          <Avatar key={p.userId} className="h-5 w-5 border border-background">
            <AvatarImage src={resolveImageUrl(p.user?.image)} />
            <AvatarFallback className="text-micro">
              {getInitials(p.user?.name)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <div className="flex items-center gap-1 ml-auto">
        <AnimatedIconButton
          icon={isMuted ? MicOffIcon : MicIcon}
          iconSize={12}
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 w-6 rounded-full p-0",
            isMuted && "text-status-danger-ink",
          )}
          onClick={onToggleMute}
          aria-label={isMuted ? "Unmute" : "Mute"}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 rounded-full p-0 text-destructive"
          onClick={onLeave}
          aria-label="Leave huddle"
          disabled={isLeavePending}
        >
          <PhoneOff className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
