"use client";
import "@excalidraw/excalidraw/index.css";

import { useRef, useState, useCallback } from "react";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useWhiteboard, useUpdateWhiteboard } from "@/hooks/api/projects";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";

interface ExcalidrawCanvasProps {
  projectId: number;
  board: { id: number; name: string };
}

export function ExcalidrawCanvas({ projectId, board }: ExcalidrawCanvasProps) {
  const { data, isLoading, isError, refetch } = useWhiteboard(projectId, board.id);
  const update = useUpdateWhiteboard(projectId);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const handleRetry = useCallback(() => refetch(), [refetch]);

  const setApi = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api;
  }, []);

  const handleChange = useCallback(() => {
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const serialized = serializeAsJSON(
      api.getSceneElements(),
      api.getAppState(),
      api.getFiles(),
      "database",
    );
    const sceneData = JSON.parse(serialized) as Record<string, unknown>;
    update.mutate(
      { id: board.id, data: sceneData },
      {
        onSuccess: () => {
          toast.success("Board saved");
          setIsDirty(false);
        },
        onError: () => toast.error("Failed to save board"),
      },
    );
  }, [board.id, update]);

  if (isLoading) return <LoadingState variant="page" />;
  if (isError || !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <ErrorState onRetry={handleRetry} />
      </div>
    );
  }

  const storedData = data.data;
  const hasScene =
    storedData &&
    typeof storedData === "object" &&
    "elements" in storedData &&
    Array.isArray(storedData.elements);

  // Safe cast: storedData is the output of serializeAsJSON parsed back from JSONB
  const initialData = hasScene ? (storedData as unknown as ExcalidrawInitialDataState) : undefined;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between pb-2 shrink-0">
        <span className="text-sm font-semibold truncate text-foreground">{board.name}</span>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950 text-xs font-medium"
            >
              Unsaved
            </Badge>
          )}
          <Button
            size="sm"
            className="h-8"
            onClick={handleSave}
            disabled={!isDirty || update.isPending}
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-border">
        <Excalidraw
          key={board.id}
          excalidrawAPI={setApi}
          initialData={initialData}
          onChange={handleChange}
          UIOptions={{
            canvasActions: {
              export: false,
              loadScene: false,
            },
          }}
        />
      </div>
    </div>
  );
}
