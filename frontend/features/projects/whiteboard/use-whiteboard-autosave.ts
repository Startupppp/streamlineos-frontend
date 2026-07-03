"use client";

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from "react";
import { serializeAsJSON, getSceneVersion } from "@excalidraw/excalidraw";
import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import type { WhiteboardAccess, ExcalidrawSceneData } from "@/hooks/api/projects";

export type SaveStatus = "clean" | "dirty" | "saving" | "saved";

type ChangeHandler = NonNullable<ExcalidrawProps["onChange"]>;
type Elements = Parameters<ChangeHandler>[0];
type SceneAppState = Parameters<ChangeHandler>[1];
type Files = Parameters<ChangeHandler>[2];

interface PendingScene {
  elements: Elements;
  appState: SceneAppState;
  files: Files;
}

export interface AutosaveOptions {
  boardId: number;
  access: WhiteboardAccess;
  initialVersion: number;
  saveAsync: (data: ExcalidrawSceneData) => Promise<unknown>;
  onSaveError?: () => void;
}

export function useWhiteboardAutosave({
  access,
  initialVersion,
  saveAsync,
  onSaveError,
}: AutosaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("clean");

  const pendingRef = useRef<PendingScene | null>(null);
  const lastSavedVersionRef = useRef<number>(initialVersion);
  const appliedInitialRef = useRef<number>(initialVersion);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accessRef = useRef(access);
  const saveAsyncRef = useRef(saveAsync);
  const onSaveErrorRef = useRef(onSaveError);

  useLayoutEffect(() => {
    accessRef.current = access;
    saveAsyncRef.current = saveAsync;
    onSaveErrorRef.current = onSaveError;
  });

  useLayoutEffect(() => {
    if (appliedInitialRef.current !== initialVersion && pendingRef.current === null) {
      appliedInitialRef.current = initialVersion;
      lastSavedVersionRef.current = initialVersion;
    }
  }, [initialVersion]);

  const performSave = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending || accessRef.current === "view") return;

    const currentVersion = getSceneVersion(pending.elements);
    if (currentVersion === lastSavedVersionRef.current) return;

    const sceneData: ExcalidrawSceneData = JSON.parse(
      serializeAsJSON(pending.elements, pending.appState, pending.files, "database"),
    );

    setStatus("saving");
    try {
      await saveAsyncRef.current(sceneData);
      lastSavedVersionRef.current = currentVersion;
      setStatus("saved");
    } catch {
      setStatus("dirty");
      onSaveErrorRef.current?.();
    }
  }, []);

  const scheduleDebounce = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void performSave();
    }, 2000);
  }, [performSave]);

  const handleSceneChange = useCallback<ChangeHandler>(
    (elements, appState, files) => {
      if (accessRef.current === "view") return;
      const version = getSceneVersion(elements);
      if (version === lastSavedVersionRef.current) return;
      pendingRef.current = { elements, appState, files };
      setStatus("dirty");
      scheduleDebounce();
    },
    [scheduleDebounce],
  );

  const manualSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void performSave();
  }, [performSave]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      void performSave();
    };
  }, [performSave]);

  return { status, handleSceneChange, manualSave };
}
