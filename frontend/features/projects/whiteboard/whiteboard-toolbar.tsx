"use client";

import { useCallback } from "react";
import {
  Save,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Share2,
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SaveStatus } from "./use-whiteboard-autosave";

interface WhiteboardToolbarProps {
  saveStatus: SaveStatus;
  isViewMode: boolean;
  canManage: boolean;
  isFullscreen: boolean;
  listCollapsed: boolean;
  shareToken: string | null;
  onManualSave: () => void;
  onToggleFullscreen: () => void;
  onToggleList: () => void;
  onOpenShare: () => void;
}

export function WhiteboardToolbar({
  saveStatus,
  isViewMode,
  canManage,
  isFullscreen,
  listCollapsed,
  shareToken,
  onManualSave,
  onToggleFullscreen,
  onToggleList,
  onOpenShare,
}: WhiteboardToolbarProps) {
  const isSaveDisabled =
    saveStatus === "clean" || saveStatus === "saved" || saveStatus === "saving";

  const handleOpenPublicLink = useCallback(() => {
    if (!shareToken) return;
    window.open(`${window.location.origin}/board/${shareToken}`, "_blank");
  }, [shareToken]);

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-8 items-center gap-1 shrink-0">
        {saveStatus === "dirty" && (
          <span className="text-xs text-amber-600 font-medium whitespace-nowrap">Unsaved</span>
        )}
        {saveStatus === "saving" && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">Saving…</span>
        )}
        {saveStatus === "saved" && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">Saved</span>
        )}

        {!isViewMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 active:scale-[0.98]"
                onClick={onManualSave}
                disabled={isSaveDisabled}
                aria-label="Save board"
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 active:scale-[0.98]"
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 active:scale-[0.98]"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {canManage && (
              <DropdownMenuItem onClick={onOpenShare}>
                <Share2 className="h-3.5 w-3.5 mr-2" />
                Share…
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onToggleList}>
              {listCollapsed ? (
                <>
                  <PanelLeftOpen className="h-3.5 w-3.5 mr-2" />
                  Show boards
                </>
              ) : (
                <>
                  <PanelLeftClose className="h-3.5 w-3.5 mr-2" />
                  Hide boards
                </>
              )}
            </DropdownMenuItem>
            {shareToken !== null && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleOpenPublicLink}>
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  Open public link
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
