"use client";

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from "react";
import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";
import type { WhiteboardAccess, ExcalidrawSceneData } from "@/hooks/api/projects";

type ExcalidrawModule = typeof import("@excalidraw/excalidraw");

let excalidrawModule: ExcalidrawModule | null = null;

async function loadExcalidraw(): Promise<ExcalidrawModule> {
  if (!excalidrawModule) {
    excalidrawModule = await import("@excalidraw/excalidraw");
  }
  return excalidrawModule;
}

export type SaveStatus = "clean" | "dirty" | "saving" | "saved";

type ChangeHandler = NonNullable<ExcalidrawProps["onChange"]>;
type Elements = Parameters<ChangeHandler>[0];
type SceneAppState = Parameters<ChangeHandler>[1];
type Files = Parameters<ChangeHandler>[2];

interface PendingScene {
  boardId: number;
  elements: Elements;
  appState: SceneAppState;
  files: Files;
}

export interface AutosaveOptions {
  boardId: number | null;
  access: WhiteboardAccess;
  initialVersion: number;
  saveAsync: (boardId: number, data: ExcalidrawSceneData) => Promise<unknown>;
  onSaveError?: () => void;
}

export function useWhiteboardAutosave({
  boardId,
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
  const boardIdRef = useRef(boardId);
  const accessRef = useRef(access);
  const saveAsyncRef = useRef(saveAsync);
  const onSaveErrorRef = useRef(onSaveError);

  useLayoutEffect(() => {
    accessRef.current = access;
    saveAsyncRef.current = saveAsync;
    onSaveErrorRef.current = onSaveError;
  });

  const performSave = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending || accessRef.current === "view") return;

    const { serializeAsJSON, getSceneVersion } = await loadExcalidraw();
    const currentVersion = getSceneVersion(pending.elements);
    if (
      pending.boardId === boardIdRef.current &&
      currentVersion === lastSavedVersionRef.current
    ) {
      return;
    }

    const sceneData: ExcalidrawSceneData = JSON.parse(
      serializeAsJSON(pending.elements, pending.appState, pending.files, "database"),
    );

    setStatus("saving");
    try {
      await saveAsyncRef.current(pending.boardId, sceneData);
      if (pendingRef.current === pending) {
        pendingRef.current = null;
        if (pending.boardId === boardIdRef.current) {
          lastSavedVersionRef.current = currentVersion;
        }
        setStatus("saved");
      }
    } catch {
      setStatus("dirty");
      onSaveErrorRef.current?.();
    }
  }, []);

  useLayoutEffect(() => {
    if (boardIdRef.current === boardId) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const hadPending = pendingRef.current !== null;
    boardIdRef.current = boardId;
    lastSavedVersionRef.current = initialVersion;
    appliedInitialRef.current = initialVersion;
    queueMicrotask(() => {
      setStatus("clean");
      if (hadPending) void performSave();
    });
  }, [boardId, initialVersion, performSave]);

  useLayoutEffect(() => {
    if (appliedInitialRef.current !== initialVersion && pendingRef.current === null) {
      appliedInitialRef.current = initialVersion;
      lastSavedVersionRef.current = initialVersion;
    }
  }, [initialVersion]);

  const scheduleDebounce = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void performSave();
    }, 2000);
  }, [performSave]);

  const handleSceneChange = useCallback<ChangeHandler>(
    (elements, appState, files) => {
      const activeBoardId = boardIdRef.current;
      if (accessRef.current === "view" || activeBoardId === null) return;
      const version = excalidrawModule ? excalidrawModule.getSceneVersion(elements) : null;
      if (version !== null && version === lastSavedVersionRef.current) return;
      pendingRef.current = { boardId: activeBoardId, elements, appState, files };
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
    void loadExcalidraw();
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
