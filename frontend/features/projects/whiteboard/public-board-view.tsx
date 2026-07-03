"use client";

import "@excalidraw/excalidraw/index.css";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useEffect, useCallback, useState } from "react";
import { Eye, Link2Off } from "lucide-react";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  usePublicWhiteboard,
  useUpdatePublicWhiteboard,
} from "@/hooks/api/projects";
import type { ExcalidrawSceneData } from "@/hooks/api/projects";
import { isExcalidrawScene } from "./scene-utils";

type SaveStatus = "saved" | "saving" | "unsaved";

interface ExcalidrawEditorProps {
  initialData: ExcalidrawInitialDataState | undefined;
  viewMode: boolean;
  allowExport: boolean;
  onApiReady: (api: ExcalidrawImperativeAPI) => void;
  onSceneChange: () => void;
}

const ExcalidrawEditor = dynamic<ExcalidrawEditorProps>(
  async () => {
    const { Excalidraw } = await import("@excalidraw/excalidraw");

    function Editor({
      initialData,
      viewMode,
      allowExport,
      onApiReady,
      onSceneChange,
    }: ExcalidrawEditorProps) {
      return (
        <Excalidraw
          initialData={initialData}
          viewModeEnabled={viewMode}
          excalidrawAPI={onApiReady}
          onChange={onSceneChange}
          UIOptions={{
            canvasActions: allowExport
              ? { loadScene: false }
              : { loadScene: false, export: false, saveAsImage: false },
          }}
        />
      );
    }

    return Editor;
  },
  { ssr: false },
);

function buildSceneData(scene: ExcalidrawInitialDataState): ExcalidrawSceneData {
  return {
    elements: [...(scene.elements ?? [])],
    appState: scene.appState ?? undefined,
    files: scene.files ?? undefined,
    type: scene.type,
    version: scene.version,
    source: scene.source,
  };
}

interface PublicBoardViewProps {
  shareToken: string;
}

export function PublicBoardView({ shareToken }: PublicBoardViewProps) {
  const { data, isLoading, isError } = usePublicWhiteboard(shareToken);
  const updateMutation = useUpdatePublicWhiteboard(shareToken);

  const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const sceneVersionRef = useRef<number>(-1);
  const pendingSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const performSaveRef = useRef<(() => void) | null>(null);
  const consecutiveFailsRef = useRef(0);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  const performSave = useCallback(() => {
    const api = excalidrawApiRef.current;
    if (!api) return;

    void import("@excalidraw/excalidraw").then(({ serializeAsJSON }) => {
      const serialized = serializeAsJSON(
        api.getSceneElements(),
        api.getAppState(),
        api.getFiles(),
        "database",
      );
      const parsed: unknown = JSON.parse(serialized);
      if (!isExcalidrawScene(parsed)) return;

      const sceneData = buildSceneData(parsed);
      setSaveStatus("saving");
      updateMutation.mutate(sceneData, {
        onSuccess: () => {
          setSaveStatus("saved");
          consecutiveFailsRef.current = 0;
        },
        onError: () => {
          setSaveStatus("unsaved");
          if (consecutiveFailsRef.current === 0) {
            toast.error("Could not save — the link may have expired");
          }
          consecutiveFailsRef.current += 1;
        },
      });
    });
  }, [updateMutation]);

  useEffect(() => {
    performSaveRef.current = performSave;
  });

  useEffect(() => {
    return () => {
      if (pendingSaveRef.current !== null) {
        clearTimeout(pendingSaveRef.current);
        pendingSaveRef.current = null;
        performSaveRef.current?.();
      }
    };
  }, []);

  const handleSceneChange = useCallback(() => {
    const api = excalidrawApiRef.current;
    if (!api || !data || data.access !== "edit") return;

    void import("@excalidraw/excalidraw").then(({ getSceneVersion }) => {
      const current = getSceneVersion(api.getSceneElements());
      if (sceneVersionRef.current === -1) {
        sceneVersionRef.current = current;
        return;
      }
      if (current === sceneVersionRef.current) return;
      sceneVersionRef.current = current;
      setSaveStatus("unsaved");

      if (pendingSaveRef.current !== null) clearTimeout(pendingSaveRef.current);
      pendingSaveRef.current = setTimeout(() => {
        pendingSaveRef.current = null;
        performSaveRef.current?.();
      }, 3000);
    });
  }, [data]);

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    excalidrawApiRef.current = api;
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col h-dvh">
        <div className="flex items-center justify-between px-4 h-12 border-b border-border bg-background shrink-0 gap-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="flex-1 rounded-none" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh gap-4 px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <Link2Off className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="space-y-1.5 max-w-xs">
          <p className="text-base font-semibold text-foreground">
            This board link is invalid or has expired
          </p>
          <p className="text-sm text-muted-foreground">
            Ask the owner to share a new link.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Go to StreamlineOS</Link>
        </Button>
      </div>
    );
  }

  const initialData = isExcalidrawScene(data.data) ? data.data : undefined;
  const isViewOnly = data.access === "view";

  return (
    <div className="flex flex-col h-dvh">
      <header className="flex items-center justify-between px-4 h-12 border-b border-border bg-background shrink-0 gap-3 min-w-0">
        <p className="text-sm font-medium truncate min-w-0 flex-1 text-foreground">
          {data.name}
        </p>
        <div className="shrink-0 flex items-center gap-2">
          {isViewOnly ? (
            <Badge variant="secondary" className="gap-1 text-xs font-medium">
              <Eye className="w-3 h-3" />
              View only
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {saveStatus === "saving"
                ? "Saving…"
                : saveStatus === "unsaved"
                  ? "Unsaved"
                  : "Saved"}
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <ExcalidrawEditor
          initialData={initialData}
          viewMode={isViewOnly}
          allowExport={data.allowExport}
          onApiReady={handleApiReady}
          onSceneChange={handleSceneChange}
        />
      </div>
    </div>
  );
}
