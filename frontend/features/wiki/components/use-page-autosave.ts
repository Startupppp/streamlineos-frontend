"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isApiError } from "@/lib/api-envelope";
import {
  UNATTRIBUTED_PAGE_EDIT_CONFLICT,
  kbPageEditConflictContract,
  type KbPageEditConflict,
} from "@/features/wiki/lib/wiki-schema";

const PAGE_AUTOSAVE_DELAY_MS = 1500;

export interface PageAutosavePatch {
  title?: string;
  content?: unknown;
  contentText?: string;
}

type PageSaveState = "idle" | "pending" | "saving" | "saved";

type SavePayload = PageAutosavePatch & {
  pageId: number;
  expectedContentRevision: number;
};

interface UsePageAutosaveArgs {
  pageId: number;
  contentRevision: number | undefined;
  save: (payload: SavePayload) => Promise<{ contentRevision: number }>;
  onConflict: (conflict: KbPageEditConflict) => void;
  onSaveError: (error: unknown) => void;
  delayMs?: number;
}

export function usePageAutosave({
  pageId,
  contentRevision,
  save,
  onConflict,
  onSaveError,
  delayMs = PAGE_AUTOSAVE_DELAY_MS,
}: UsePageAutosaveArgs) {
  const [saveState, setSaveState] = useState<PageSaveState>("idle");
  const [conflict, setConflict] = useState<KbPageEditConflict | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingFields, setPendingFields] = useState<readonly string[]>([]);

  const conflictRef = useRef<KbPageEditConflict | null>(null);
  const pendingPatchRef = useRef<PageAutosavePatch | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const offlineRef = useRef(false);
  const revisionRef = useRef<{ pageId: number; value: number } | null>(null);
  const runRef = useRef<((patch: PageAutosavePatch) => void) | null>(null);
  const pageIdRef = useRef(pageId);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handlersRef = useRef({ save, onConflict, onSaveError });
  useEffect(() => {
    handlersRef.current = { save, onConflict, onSaveError };
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const setStateIfMounted = useCallback((next: PageSaveState) => {
    if (mountedRef.current) setSaveState(next);
  }, []);

  const adoptRevision = useCallback((forPageId: number, value: number) => {
    const known = revisionRef.current;
    if (known !== null && known.pageId === forPageId && known.value >= value) return;
    revisionRef.current = { pageId: forPageId, value };
  }, []);

  const drainQueued = useCallback(() => {
    if (conflictRef.current !== null) return;
    const queued = pendingPatchRef.current;
    if (queued === null) return;
    const next = runRef.current;
    if (next === null) return;
    pendingPatchRef.current = null;
    next(queued);
  }, []);

  const run = useCallback(
    (patch: PageAutosavePatch) => {
      const targetPageId = pageIdRef.current;
      const known = revisionRef.current;
      if (
        inFlightRef.current ||
        known === null ||
        known.pageId !== targetPageId ||
        offlineRef.current
      ) {
        pendingPatchRef.current = { ...patch, ...(pendingPatchRef.current ?? {}) };
        setStateIfMounted("pending");
        return;
      }
      inFlightRef.current = true;
      setStateIfMounted("saving");
      const payload: SavePayload = {
        pageId: targetPageId,
        ...patch,
        expectedContentRevision: known.value,
      };

      function handleSaved(data: { contentRevision: number }) {
        inFlightRef.current = false;
        adoptRevision(targetPageId, data.contentRevision);
        setStateIfMounted("saved");
        if (mountedRef.current) setSavedAt(new Date());
        drainQueued();
      }

      function handleFailed(error: unknown) {
        inFlightRef.current = false;
        setStateIfMounted("idle");
        pendingPatchRef.current = { ...patch, ...(pendingPatchRef.current ?? {}) };
        if (isApiError(error) && error.status === 409) {
          const parsed = kbPageEditConflictContract.safeParse(error.details);
          const detail = parsed.success ? parsed.data : UNATTRIBUTED_PAGE_EDIT_CONFLICT;
          conflictRef.current = detail;
          if (mountedRef.current) setConflict(detail);
          handlersRef.current.onConflict(detail);
          return;
        }
        handlersRef.current.onSaveError(error);
      }

      handlersRef.current.save(payload).then(handleSaved, handleFailed);
    },
    [adoptRevision, drainQueued, setStateIfMounted],
  );

  useEffect(() => {
    runRef.current = run;
  });

  const schedule = useCallback(
    (patch: PageAutosavePatch) => {
      pendingPatchRef.current = { ...(pendingPatchRef.current ?? {}), ...patch };
      setPendingFields(Object.keys(pendingPatchRef.current));
      if (conflictRef.current !== null) {
        clearTimer();
        return;
      }
      setSaveState("pending");
      clearTimer();
      timerRef.current = setTimeout(function drainTimer() {
        timerRef.current = null;
        const queued = pendingPatchRef.current;
        pendingPatchRef.current = null;
        setPendingFields([]);
        if (queued) run(queued);
      }, delayMs);
    },
    [clearTimer, delayMs, run],
  );

  const flush = useCallback(() => {
    clearTimer();
    if (conflictRef.current !== null) return;
    const queued = pendingPatchRef.current;
    if (!queued) return;
    pendingPatchRef.current = null;
    run(queued);
  }, [clearTimer, run]);

  useEffect(() => {
    if (contentRevision === undefined) return;
    const known = revisionRef.current;
    const hadRevision = known !== null && known.pageId === pageId;
    adoptRevision(pageId, contentRevision);
    if (!hadRevision && pendingPatchRef.current !== null) flush();
  }, [pageId, contentRevision, flush, adoptRevision]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  useEffect(() => {
    function handleOffline() {
      offlineRef.current = true;
      if (mountedRef.current) setIsOffline(true);
    }
    function handleOnline() {
      offlineRef.current = false;
      if (mountedRef.current) setIsOffline(false);
      drainQueued();
    }
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [drainQueued]);

  useEffect(() => {
    conflictRef.current = null;
    setConflict(null);
    pendingPatchRef.current = null;
    setSaveState("idle");
    pageIdRef.current = pageId;
    return flush;
  }, [pageId, flush]);

  const discardLocalEdits = useCallback(() => {
    clearTimer();
    conflictRef.current = null;
    setConflict(null);
    pendingPatchRef.current = null;
    setSaveState("idle");
  }, [clearTimer]);

  const keepLocalEdits = useCallback(() => {
    const detail = conflictRef.current;
    let adopted = false;
    if (detail !== null && detail.currentContentRevision !== null) {
      adoptRevision(pageIdRef.current, detail.currentContentRevision);
      adopted = true;
    }
    conflictRef.current = null;
    setConflict(null);
    if (adopted) flush();
  }, [adoptRevision, flush]);

  return { saveState, conflict, savedAt, isOffline, pendingFields, schedule, discardLocalEdits, keepLocalEdits };
}
