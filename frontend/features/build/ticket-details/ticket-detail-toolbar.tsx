"use client";

import { useState } from "react";
import { PanelRightOpen } from "lucide-react";
import { EllipsisIcon, ShareIcon, Trash2Icon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { TicketDetailActions, TicketDetailDeleteDialog } from "./ticket-detail-actions";

interface TicketDetailToolbarProps {
  isMobile: boolean;
  rightPanelCollapsed: boolean;
  onExpandRightPanel: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  subtaskCount?: number;
}

export function TicketDetailToolbar({
  isMobile,
  rightPanelCollapsed,
  onExpandRightPanel,
  onDelete,
  isDeleting,
  subtaskCount,
}: TicketDetailToolbarProps) {
  const [overflowDeleteOpen, setOverflowDeleteOpen] = useState(false);
  const canDeleteTicket = useCan("build:tickets:delete");

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  function handleOpenOverflowDelete() {
    setOverflowDeleteOpen(true);
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      {rightPanelCollapsed ? (
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 touch-manipulation border-border/60 bg-card/50 backdrop-blur-sm sm:h-8 sm:w-8"
          onClick={onExpandRightPanel}
          aria-label="Expand details panel"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      ) : null}

      {isMobile ? (
        canDeleteTicket ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <AnimatedIconButton
                  size="icon"
                  variant="outline"
                  icon={EllipsisIcon}
                  iconSize={16}
                  className="h-9 w-9 touch-manipulation border-border/60 bg-card/50 backdrop-blur-sm sm:h-8 sm:w-8"
                  aria-label="More actions"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent forceMount align="end" className="w-52">
                <DropdownMenuItem onSelect={handleShare} className="gap-2">
                  <ShareIcon size={14} />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={handleOpenOverflowDelete} className="gap-2">
                  <Trash2Icon size={14} />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TicketDetailDeleteDialog
              open={overflowDeleteOpen}
              onOpenChange={setOverflowDeleteOpen}
              onDelete={onDelete}
              isDeleting={isDeleting}
              subtaskCount={subtaskCount}
            />
          </>
        ) : (
          <AnimatedIconButton
            size="icon"
            variant="outline"
            icon={ShareIcon}
            iconSize={16}
            className="h-9 w-9 touch-manipulation border-border/60 bg-card/50 backdrop-blur-sm sm:h-8 sm:w-8"
            onClick={handleShare}
            aria-label="Copy share link"
          />
        )
      ) : (
        <>
          <AnimatedIconButton
            size="icon"
            variant="outline"
            icon={ShareIcon}
            iconSize={16}
            className="h-8 w-8 touch-manipulation border-border/60 bg-card/50 backdrop-blur-sm"
            onClick={handleShare}
            aria-label="Copy share link"
          />
          {canDeleteTicket && (
            <TicketDetailActions
              onDelete={onDelete}
              isDeleting={isDeleting}
              subtaskCount={subtaskCount}
            />
          )}
        </>
      )}
    </div>
  );
}
