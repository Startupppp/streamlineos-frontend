"use client";

import { useCallback, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { AiActionsMenu } from "@/components/ai";
import type { AiAction } from "@/components/ai";
import { ReplyIcon, StarIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Archive, MailOpen } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { MailMessageSummary } from "@/types/mail";

export interface MailReadingToolbarProps {
  message: MailMessageSummary;
  onReply: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onMarkUnread: () => void;
  onToggleStar: () => void;
  aiActions: AiAction[];
  canAi: boolean;
}

export const MailReadingToolbar = forwardRef<
  HTMLDivElement,
  MailReadingToolbarProps
>(function MailReadingToolbar(
  {
    message,
    onReply,
    onArchive,
    onTrash,
    onMarkUnread,
    onToggleStar,
    aiActions,
    canAi,
  },
  _ref,
) {
  const { iconRef: starRef, hoverHandlers: starHover } = useAnimatedIcon();

  const handleArchiveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onArchive();
    },
    [onArchive],
  );

  const handleUnreadClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMarkUnread();
    },
    [onMarkUnread],
  );

  const handleStarClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleStar();
    },
    [onToggleStar],
  );

  return (
    <div className="flex items-center gap-1 shrink-0">
      <AnimatedIconButton
        icon={ReplyIcon}
        iconSize={14}
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={onReply}
        aria-label="Reply"
      >
        Reply
      </AnimatedIconButton>

      <button
        type="button"
        className="flex items-center justify-center h-8 w-8 rounded-md border border-input bg-card hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={handleArchiveClick}
        aria-label="Archive"
      >
        <Archive className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </button>

      <AnimatedIconButton
        icon={Trash2Icon}
        iconSize={14}
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={onTrash}
        aria-label="Move to trash"
      />

      <button
        type="button"
        className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={handleUnreadClick}
        aria-label="Mark as unread"
        title="Mark as unread"
      >
        <MailOpen className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </button>

      <button
        type="button"
        className={cn(
          "flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          message.isStarred ? "text-amber-500" : "text-muted-foreground",
        )}
        onClick={handleStarClick}
        aria-label={message.isStarred ? "Unstar" : "Star"}
        {...starHover}
      >
        <StarIcon ref={starRef} size={14} />
      </button>

      {canAi && aiActions.length > 0 && (
        <AiActionsMenu
          actions={aiActions}
          triggerLabel="AI"
          menuLabel="AI assist"
          align="end"
        />
      )}
    </div>
  );
});
