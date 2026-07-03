"use client";
import "@excalidraw/excalidraw/index.css";

import { useState, useCallback, useEffect } from "react";
import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import { Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useWhiteboard,
  useUpdateWhiteboard,
  type WhiteboardSummary,
  type ExcalidrawSceneData,
} from "@/hooks/api/projects";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { isExcalidrawScene, computeStoredVersion } from "./scene-utils";
import { useWhiteboardAutosave } from "./use-whiteboard-autosave";
import { ShareDialog } from "./share-dialog";
import { WhiteboardToolbar } from "./whiteboard-toolbar";

interface ExcalidrawCanvasProps {
  projectId: number;
  board: WhiteboardSummary;
  listCollapsed: boolean;
  onToggleList: () => void;
}

export function ExcalidrawCanvas({
  projectId,
  board,
  listCollapsed,
  onToggleList,
}: ExcalidrawCanvasProps) {
  const { data: detail, isLoading, isError, refetch } = useWhiteboard(projectId, board.id);
  const update = useUpdateWhiteboard(projectId);
  const [shareOpen, setShareOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const initialVersion = computeStoredVersion(detail?.data.elements ?? []);

  const handleSaveAsync = useCallback(
    async (data: ExcalidrawSceneData) => {
      await update.mutateAsync({ id: board.id, data });
    },
    [board.id, update],
  );

  const { status, handleSceneChange, manualSave } = useWhiteboardAutosave({
    boardId: board.id,
    access: detail?.access ?? "view",
    initialVersion,
    saveAsync: handleSaveAsync,
    onSaveError: () => toast.error("Failed to save board"),
  });

  const handleRetry = useCallback(() => refetch(), [refetch]);
  const handleManualSave = useCallback(() => manualSave(), [manualSave]);
  const handleOpenShare = useCallback(() => setShareOpen(true), []);
  const handleShareOpenChange = useCallback((open: boolean) => setShareOpen(open), []);
  const handleToggleFullscreen = useCallback(() => setIsFullscreen((prev) => !prev), []);
  const handleExitFullscreen = useCallback(() => setIsFullscreen(false), []);

  useEffect(() => {
    if (!isFullscreen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleExitFullscreen();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, handleExitFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  if (isLoading) return <LoadingState variant="page" />;
  if (isError || !detail) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <ErrorState onRetry={handleRetry} />
      </div>
    );
  }

  const initialData = isExcalidrawScene(detail.data) ? detail.data : undefined;
  const isViewMode = detail.access === "view";
  const canManage = detail.access === "manage";
  const shareToken = detail.sharing?.shareToken ?? null;

  return (
    <>
      <div
        className={
          isFullscreen
            ? "fixed inset-0 z-50 bg-background flex flex-col"
            : "flex flex-col flex-1 min-h-0"
        }
      >
        {isFullscreen ? (
          <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
            <span className="flex-1 truncate text-sm font-semibold text-foreground">
              {board.name}
            </span>
            {status === "dirty" && (
              <span className="text-xs text-amber-600 font-medium">Unsaved</span>
            )}
            {status === "saving" && (
              <span className="text-xs text-muted-foreground">Saving…</span>
            )}
            {status === "saved" && (
              <span className="text-xs text-muted-foreground">Saved</span>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 active:scale-[0.98]"
              onClick={handleExitFullscreen}
              aria-label="Exit fullscreen"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="mb-2">
            <WhiteboardToolbar
              boardName={board.name}
              visibility={detail.visibility}
              saveStatus={status}
              isViewMode={isViewMode}
              canManage={canManage}
              isFullscreen={isFullscreen}
              listCollapsed={listCollapsed}
              shareToken={shareToken}
              onManualSave={handleManualSave}
              onToggleFullscreen={handleToggleFullscreen}
              onToggleList={onToggleList}
              onOpenShare={handleOpenShare}
            />
          </div>
        )}

        <div
          className={
            isFullscreen
              ? "flex-1 min-h-0"
              : "flex-1 min-h-0 rounded-lg overflow-hidden border border-border"
          }
        >
          <Excalidraw
            key={board.id}
            initialData={initialData}
            onChange={handleSceneChange}
            viewModeEnabled={isViewMode}
            UIOptions={{
              canvasActions: {
                export: isViewMode ? false : undefined,
                loadScene: false,
              },
            }}
          >
            <MainMenu>
              {!isViewMode && <MainMenu.DefaultItems.ClearCanvas />}
              <MainMenu.DefaultItems.ToggleTheme />
              <MainMenu.DefaultItems.ChangeCanvasBackground />
              <MainMenu.DefaultItems.SaveAsImage />
            </MainMenu>
          </Excalidraw>
        </div>
      </div>

      {canManage && detail.sharing !== null && (
        <ShareDialog
          projectId={projectId}
          whiteboard={detail}
          open={shareOpen}
          onOpenChange={handleShareOpenChange}
        />
      )}
    </>
  );
}
