"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { HuddleParticipant } from "@/types/chat";
import { getInitials } from "@/lib/format-utils";

interface HuddleParticipantCardProps {
  participant: HuddleParticipant;
  isCurrentUser: boolean;
}

export function HuddleParticipantCard({
  participant,
  isCurrentUser,
}: HuddleParticipantCardProps) {
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
    </div>
  );
}
