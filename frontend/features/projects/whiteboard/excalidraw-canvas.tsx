"use client";
import "@excalidraw/excalidraw/index.css";

import { useState, useCallback } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import { Share2, Lock, Globe, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface ExcalidrawCanvasProps {
  projectId: number;
  board: WhiteboardSummary;
}

export function ExcalidrawCanvas({ projectId, board }: ExcalidrawCanvasProps) {
  const { data: detail, isLoading, isError, refetch } = useWhiteboard(projectId, board.id);
  const update = useUpdateWhiteboard(projectId);
  const [shareOpen, setShareOpen] = useState(false);

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
  const isSaveDisabled = status === "clean" || status === "saved" || status === "saving";

  const visibilityIcon =
    detail.visibility === "private" ? (
      <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Private" />
    ) : detail.visibility === "public" ? (
      <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Public" />
    ) : null;

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between pb-2 shrink-0 gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold truncate text-foreground min-w-0">
            {visibilityIcon}
            <span className="truncate">{board.name}</span>
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {status === "dirty" && (
              <Badge
                variant="outline"
                className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950 text-xs font-medium"
              >
                Unsaved
              </Badge>
            )}
            {status === "saving" && (
              <Badge variant="outline" className="text-muted-foreground text-xs font-medium">
                Saving…
              </Badge>
            )}
            {status === "saved" && (
              <Badge
                variant="outline"
                className="text-muted-foreground text-xs font-medium flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Saved
              </Badge>
            )}

            {!isViewMode && (
              <Button size="sm" className="h-8" onClick={handleManualSave} disabled={isSaveDisabled}>
                <Save className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
            )}

            {canManage && (
              <Button size="sm" variant="outline" className="h-8" onClick={handleOpenShare}>
                <Share2 className="h-3.5 w-3.5 mr-1" />
                Share
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-border">
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
          />
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
