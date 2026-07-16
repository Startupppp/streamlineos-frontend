"use client";

import { useCallback } from "react";
import {
  Save,
  Maximize2,
  Minimize2,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ExternalLinkIcon } from "@animateicons/react/lucide";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SaveStatus } from "./use-whiteboard-autosave";

interface WhiteboardToolbarProps {
  saveStatus: SaveStatus;
  isViewMode: boolean;
  canManage: boolean;
  isFullscreen: boolean;
  shareToken: string | null;
  onManualSave: () => void;
  onToggleFullscreen: () => void;
  onOpenShare: () => void;
}

export function WhiteboardToolbar({
  saveStatus,
  isViewMode,
  canManage,
  isFullscreen,
  shareToken,
  onManualSave,
  onToggleFullscreen,
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

        {canManage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 active:scale-[0.98]"
                onClick={onOpenShare}
                aria-label="Share board"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>
        )}

        {shareToken !== null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AnimatedIconButton
                size="icon"
                variant="ghost"
                className="h-8 w-8 active:scale-[0.98]"
                onClick={handleOpenPublicLink}
                aria-label="Open public link"
                icon={ExternalLinkIcon}
                iconSize={16}
              />
            </TooltipTrigger>
            <TooltipContent>Open public link</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
