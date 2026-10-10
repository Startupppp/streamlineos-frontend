"use client";

import { useCallback, forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { AiActionsMenu } from "@/components/ai";
import type { AiAction } from "@/components/ai";
import { ReplyIcon, StarIcon, Trash2Icon } from "@animateicons/react/lucide";
import {
  Archive,
  MailOpen,
  MoreHorizontal,
  Reply,
  Star,
  Trash2,
} from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMailOverflowMode } from "./mail-presentation";
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
  const overflowMode = useMailOverflowMode();
  const [aiPickerOpen, setAiPickerOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const handleArchiveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setOverflowOpen(false);
      onArchive();
    },
    [onArchive],
  );

  const handleUnreadClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setOverflowOpen(false);
      onMarkUnread();
    },
    [onMarkUnread],
  );

  const handleStarClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setOverflowOpen(false);
      onToggleStar();
    },
    [onToggleStar],
  );

  const handleAiPickerOpen = useCallback(() => {
    setOverflowOpen(false);
    setAiPickerOpen(true);
  }, []);

  const handleTrashClick = useCallback(() => {
    setOverflowOpen(false);
    onTrash();
  }, [onTrash]);

  if (overflowMode === "collapse") {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          size="icon"
          className="size-9 p-0"
          onClick={onReply}
          aria-label="Reply"
          title="Reply"
        >
          <Reply className="size-4" aria-hidden="true" />
        </Button>

        <ResponsivePopover open={overflowOpen} onOpenChange={setOverflowOpen}>
          <ResponsivePopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9"
              aria-label="More message actions"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </ResponsivePopoverTrigger>
          <ResponsivePopoverContent
            title="Message actions"
            align="end"
            className="min-w-52"
          >
            <div className="flex flex-col gap-0.5 p-1">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={handleArchiveClick}
              >
                <Archive className="size-4" aria-hidden="true" /> Archive
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={handleUnreadClick}
              >
                <MailOpen className="size-4" aria-hidden="true" /> Mark as unread
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={handleStarClick}
              >
                <Star
                  className={cn(
                    "size-4",
                    message.isStarred && "fill-current text-status-warning-ink",
                  )}
                  aria-hidden="true"
                />
                {message.isStarred ? "Unstar" : "Star"}
              </button>
              {canAi && aiActions.length > 0 ? (
                <>
                  <div className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    onClick={handleAiPickerOpen}
                  >
                    AI assist
                  </button>
                </>
              ) : null}
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={handleTrashClick}
              >
                <Trash2 className="size-4" aria-hidden="true" /> Move to trash
              </button>
            </div>
          </ResponsivePopoverContent>
        </ResponsivePopover>
        {canAi && aiActions.length > 0 ? (
          <AiActionsMenu
            actions={aiActions}
            menuLabel="AI assist"
            pickerOpen={aiPickerOpen}
            onPickerOpenChange={setAiPickerOpen}
            hideTrigger
          />
        ) : null}
      </div>
    );
  }

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
