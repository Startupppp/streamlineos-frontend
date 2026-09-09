"use client";

import { PhoneOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import type { Huddle } from "@/types/chat";
import { getInitials } from "@/lib/format-utils";

interface HuddleMiniBarProps {
  participants: Huddle["participants"];
  meetingUrl: string | null;
  onLeave: () => void;
  isLeavePending: boolean;
}

export function HuddleMiniBar({
  participants,
  meetingUrl,
  onLeave,
  isLeavePending,
}: HuddleMiniBarProps) {
  return (
    <div className="px-4 pb-2 flex items-center gap-2">
      <div className="flex -space-x-1.5">
        {participants.slice(0, 4).map((p) => (
          <Avatar key={p.id} className="h-5 w-5 border border-background">
            <AvatarImage src={resolveImageUrl(p.user?.image)} />
            <AvatarFallback className="text-micro">
              {getInitials(p.user?.name)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <div className="flex items-center gap-1 ml-auto">
        {meetingUrl ? (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-micro font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Video className="h-3 w-3 shrink-0" />
            Join
          </a>
        ) : (
          <span className="text-micro text-muted-foreground">No meeting link</span>
        )}
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
