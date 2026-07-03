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
  Lock,
  Globe,
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
import type { WhiteboardVisibility } from "@/hooks/api/projects";

interface WhiteboardToolbarProps {
  boardName: string;
  visibility: WhiteboardVisibility;
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
  boardName,
  visibility,
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

  const visibilityIcon =
    visibility === "private" ? (
      <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Private" />
    ) : visibility === "public" ? (
      <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Public" />
    ) : null;

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-9 items-center gap-1 shrink-0">
        {listCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 active:scale-[0.98]"
                onClick={onToggleList}
                aria-label="Show boards panel"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Show boards</TooltipContent>
          </Tooltip>
        )}

        <span className="flex items-center gap-1.5 text-sm font-semibold truncate text-foreground min-w-0 flex-1">
          {visibilityIcon}
          <span className="truncate">{boardName}</span>
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {saveStatus === "dirty" && (
            <span className="text-xs text-amber-600 font-medium">Unsaved</span>
          )}
          {saveStatus === "saving" && (
            <span className="text-xs text-muted-foreground">Saving…</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-muted-foreground">Saved</span>
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
      </div>
    </TooltipProvider>
  );
}
