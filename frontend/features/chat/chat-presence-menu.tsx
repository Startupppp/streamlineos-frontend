"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, resolveImageUrl } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSetPresenceStatus } from "@/hooks/api/chat-core-mutations-b";
import {
  AUTO_PRESENCE_STATUSES,
  PRESENCE_LABELS,
  PRESENCE_STATUSES,
  presenceDotClass,
  presenceLabel,
  type PresenceStatus,
} from "@/lib/presence";

interface ChatPresenceMenuProps {
  compact?: boolean;
  className?: string;
}

const MANUAL_STATUSES = PRESENCE_STATUSES.filter(
  (status) => !AUTO_PRESENCE_STATUSES.includes(status),
);

export function ChatPresenceMenu({
  compact = false,
  className,
}: ChatPresenceMenuProps) {
  const { data: session } = useSession();
  const setStatus = useSetPresenceStatus();
  const [status, setLocalStatus] = useState<PresenceStatus>("ONLINE");

  const handleSelect = useCallback(
    (next: PresenceStatus) => {
      const previous = status;
      setLocalStatus(next);
      setStatus.mutate(next, {
        onError: (error) => {
          setLocalStatus(previous);
          toast.error(getErrorMessage(error));
        },
      });
    },
    [setStatus, status],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Your availability: ${presenceLabel(status)}. Change it`}
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
              <p className="text-micro text-muted-foreground">{presenceLabel(status)}</p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-micro uppercase tracking-wider text-muted-foreground">
          Availability
        </DropdownMenuLabel>
        <PresenceOption
          status="ONLINE"
          current={status}
          onSelect={handleSelect}
          hint="Set automatically from your activity"
        />
        <DropdownMenuSeparator />
        {MANUAL_STATUSES.map((option) => (
          <PresenceOption
            key={option}
            status={option}
            current={status}
            onSelect={handleSelect}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface PresenceOptionProps {
  status: PresenceStatus;
  current: PresenceStatus;
  hint?: string;
  onSelect: (status: PresenceStatus) => void;
}

function PresenceOption({ status, current, hint, onSelect }: PresenceOptionProps) {
  function handleClick() {
    onSelect(status);
  }

  return (
    <DropdownMenuItem onClick={handleClick} className="gap-2">
      <span className={cn("size-2 shrink-0 rounded-full", presenceDotClass(status))} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs">{PRESENCE_LABELS[status]}</span>
        {hint ? <span className="block text-micro text-muted-foreground">{hint}</span> : null}
      </span>
      {status === current ? (
        <span className="text-micro text-muted-foreground">Current</span>
      ) : null}
    </DropdownMenuItem>
  );
}
