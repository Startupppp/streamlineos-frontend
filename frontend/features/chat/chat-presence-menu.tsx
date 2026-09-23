"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, resolveImageUrl } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { PresenceStatusPicker } from "@/components/shared/presence-status-picker";
import { usePresenceSelection } from "@/hooks/common/use-presence-selection";
import { presenceDotClass, presenceLabel } from "@/lib/presence";

interface ChatPresenceMenuProps {
  compact?: boolean;
  className?: string;
}

export function ChatPresenceMenu({
  compact = false,
  className,
}: ChatPresenceMenuProps) {
  const { data: session } = useSession();
  const { status, statusMessage } = usePresenceSelection();
  const availability = statusMessage === "" ? presenceLabel(status) : statusMessage;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Your availability: ${availability}. Change it`}
          className={cn(
            "flex items-center rounded-lg transition-colors hover:bg-muted/60",
            compact ? "min-w-11 flex-col gap-0.5 py-1" : "w-full gap-2.5 px-2 py-1.5",
            className,
          )}
        >
          <div className="relative shrink-0">
            <Avatar className={cn("border border-border/30", compact ? "size-5" : "size-7")}>
              <AvatarImage src={resolveImageUrl(session?.user?.image)} />
              <AvatarFallback className="bg-primary/10 text-micro font-semibold text-primary">
                {session?.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-background",
                presenceDotClass(status),
                compact ? "size-2" : "size-2.5",
              )}
            />
          </div>
          {compact ? (
            <span className="text-micro leading-none text-muted-foreground">Me</span>
          ) : (
            <div className="min-w-0 flex-1 text-left">
              <TruncatedText
                text={session?.user?.name ?? "You"}
                className="text-xs font-medium"
              />
              <TruncatedText
                text={availability}
                className="text-micro text-muted-foreground"
              />
            </div>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-micro uppercase tracking-wider text-muted-foreground">
          Availability
        </DropdownMenuLabel>
        <PresenceStatusPicker layout="menu" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
