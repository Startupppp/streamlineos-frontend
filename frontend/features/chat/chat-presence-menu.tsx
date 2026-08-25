"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSetPresenceStatus } from "@/hooks/api";
import { cn, resolveImageUrl } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

type PresenceStatus = "ONLINE" | "AWAY" | "BUSY" | "INVISIBLE";

const STATUS_OPTIONS: {
  value: PresenceStatus;
  label: string;
  color: string;
}[] = [
  { value: "ONLINE", label: "Online", color: "bg-status-success-fill" },
  { value: "AWAY", label: "Away", color: "bg-status-warning-fill" },
  { value: "BUSY", label: "Busy", color: "bg-destructive" },
  { value: "INVISIBLE", label: "Invisible", color: "bg-muted-foreground" },
];

interface ChatPresenceMenuProps {
  compact?: boolean;
  className?: string;
}

export function ChatPresenceMenu({
  compact = false,
  className,
}: ChatPresenceMenuProps) {
  const { data: session } = useSession();
  const setStatus = useSetPresenceStatus();
  const [currentStatus, setCurrentStatus] =
    useState<PresenceStatus>("ONLINE");

  const handleSelectStatus = useCallback(
    (value: PresenceStatus) => {
      setCurrentStatus(value);
      setStatus.mutate(value);
    },
    [setStatus],
  );

  const currentOption =
    STATUS_OPTIONS.find((option) => option.value === currentStatus) ??
    STATUS_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center rounded-lg text-left transition-colors hover:bg-muted/40",
            compact ? "min-w-11 flex-col gap-0.5 py-1" : "w-full gap-2.5 px-2 py-1.5",
            className,
          )}
          aria-label="Set status"
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
                compact ? "size-2" : "size-2.5",
                currentOption.color,
              )}
            />
          </div>
          {compact ? (
            <span className="text-micro leading-none text-muted-foreground">Me</span>
          ) : (
            <div className="min-w-0 flex-1">
              <TruncatedText
                text={session?.user?.name ?? "You"}
                className="text-xs font-medium"
              />
              <p className="text-micro text-muted-foreground">
                {currentOption.label}
              </p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={compact ? "top" : "right"} className="w-40">
        {STATUS_OPTIONS.map((option) => {
          const handleSelect = () => handleSelectStatus(option.value);
          return (
            <DropdownMenuItem key={option.value} onSelect={handleSelect}>
              <span className={cn("mr-2 size-2 rounded-full", option.color)} />
              {option.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
