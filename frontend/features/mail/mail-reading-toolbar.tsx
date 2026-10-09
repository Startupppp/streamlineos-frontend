"use client";

import { useCallback, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { AiActionsMenu } from "@/components/ai";
import type { AiAction } from "@/components/ai";
import { ReplyIcon, StarIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Archive, MailOpen } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

function ActionTip({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
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
  _,
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
    <TooltipProvider delayDuration={300}>
      <div className="flex shrink-0 items-center gap-1">
        <ActionTip label="Reply">
          <AnimatedIconButton
            icon={ReplyIcon}
            iconSize={14}
            variant="outline"
            size="sm"
            className="size-8 p-0"
            onClick={onReply}
            aria-label="Reply"
          />
        </ActionTip>

        <ActionTip label="Archive">
          <button
            type="button"
            className="flex items-center justify-center h-8 w-8 rounded-md border border-input bg-card hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={handleArchiveClick}
            aria-label="Archive"
          >
            <Archive
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden
            />
          </button>
        </ActionTip>

        <ActionTip label="Move to trash">
          <AnimatedIconButton
            icon={Trash2Icon}
            iconSize={14}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onTrash}
            aria-label="Move to trash"
          />
        </ActionTip>

        <ActionTip label="Mark as unread">
          <button
            type="button"
            className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={handleUnreadClick}
            aria-label="Mark as unread"
            title="Mark as unread"
          >
            <MailOpen
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden
            />
          </button>
        </ActionTip>

        <ActionTip label={message.isStarred ? "Unstar" : "Star"}>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              message.isStarred
                ? "text-status-warning-ink"
                : "text-muted-foreground",
            )}
            onClick={handleStarClick}
            aria-label={message.isStarred ? "Unstar" : "Star"}
            {...starHover}
          >
            <StarIcon ref={starRef} size={14} />
          </button>
        </ActionTip>

        {canAi && aiActions.length > 0 && (
          <ActionTip label="AI assist">
            <AiActionsMenu
              actions={aiActions}
              triggerLabel="AI"
              menuLabel="AI assist"
              align="end"
              iconOnly
            />
          </ActionTip>
        )}
      </div>
    </TooltipProvider>
  );
});
