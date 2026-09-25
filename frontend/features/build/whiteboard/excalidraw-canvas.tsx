"use client";
import "@excalidraw/excalidraw/index.css";
import "./whiteboard-theme.css";

import { useEffect } from "react";
import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import { Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppTheme } from "@/components/theme/app-theme-provider";
import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import type { WhiteboardDetail } from "@/hooks/api/build";
import { isExcalidrawScene } from "./scene-utils";
import type { SaveStatus } from "./use-whiteboard-autosave";

interface ExcalidrawCanvasProps {
  detail: WhiteboardDetail;
  isFullscreen: boolean;
  saveStatus: SaveStatus;
  onSceneChange: NonNullable<ExcalidrawProps["onChange"]>;
  onExitFullscreen: () => void;
}

export function ExcalidrawCanvas({
  detail,
  isFullscreen,
  saveStatus,
  onSceneChange,
  onExitFullscreen,
}: ExcalidrawCanvasProps) {
  const { isDark } = useAppTheme();
  const theme = isDark ? "dark" : "light";

  useEffect(() => {
    if (!isFullscreen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onExitFullscreen();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, onExitFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  const initialData = isExcalidrawScene(detail.data) ? detail.data : undefined;
  const isViewMode = detail.access === "view";

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-background flex flex-col"
          : "flex flex-col flex-1 min-h-0"
      }
    >
      {isFullscreen && (
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
          <span className="flex-1 truncate text-sm font-semibold text-foreground">
            {detail.name}
          </span>
          {saveStatus === "dirty" && (
            <span className="text-xs text-status-warning-ink-strong font-medium">Unsaved</span>
          )}
          {saveStatus === "saving" && (
            <span className="text-xs text-muted-foreground">Saving…</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-muted-foreground">Saved</span>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 active:scale-[0.98]"
            onClick={onExitFullscreen}
            aria-label="Exit fullscreen"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div
        className={
          isFullscreen
            ? "wb-canvas flex-1 min-h-0"
            : "wb-canvas flex-1 min-h-0 rounded-lg overflow-hidden border border-border"
        }
      >
        <Excalidraw
          theme={theme}
          initialData={initialData}
          onChange={onSceneChange}
          viewModeEnabled={isViewMode}
          UIOptions={{
            canvasActions: {
              export: isViewMode ? false : undefined,
              loadScene: false,
              toggleTheme: false,
            },
          }}
        >
          <MainMenu>
            {!isViewMode && <MainMenu.DefaultItems.ClearCanvas />}
            <MainMenu.DefaultItems.ChangeCanvasBackground />
            <MainMenu.DefaultItems.SaveAsImage />
          </MainMenu>
        </Excalidraw>
      </div>
    </div>
  );
}
