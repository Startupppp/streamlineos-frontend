"use client";

import { Archive, Pin, PinOff } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { propagationShield } from "@/lib/keyboard-activation";

function TrashButton({
  onClick,
  isDeleting,
}: {
  onClick: (e: React.MouseEvent) => void;
  isDeleting?: boolean;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 hover:text-destructive"
      aria-label="Delete notification"
      onClick={onClick}
      disabled={isDeleting}
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={14} />
    </Button>
  );
}

export interface NotificationCardActionsProps {
  pinned: boolean;
  isArchived: boolean;
  isArchiving?: boolean;
  isPinning?: boolean;
  isDeleting?: boolean;
  onArchive?: (e: React.MouseEvent) => void;
  onPin?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export function NotificationCardActions({
  pinned,
  isArchived,
  isArchiving,
  isPinning,
  isDeleting,
  onArchive,
  onPin,
  onDelete,
}: NotificationCardActionsProps) {
  const hasActions = Boolean((!isArchived && onArchive) || onPin || onDelete);
  if (!hasActions) return null;

  return (
    <div
      className="relative z-10 flex shrink-0 items-center gap-0.5"
      {...propagationShield}
    >
      {!isArchived && onArchive ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Archive notification"
          onClick={onArchive}
          disabled={isArchiving}
        >
          <Archive className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      ) : null}
      {onPin ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label={pinned ? "Unpin notification" : "Pin notification"}
          onClick={onPin}
          disabled={isPinning}
        >
          {pinned ? (
            <PinOff className="h-3.5 w-3.5 text-status-warning-ink" />
          ) : (
            <Pin className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
      ) : null}
      {onDelete ? (
        <TrashButton onClick={onDelete} isDeleting={isDeleting} />
      ) : null}
    </div>
  );
}
