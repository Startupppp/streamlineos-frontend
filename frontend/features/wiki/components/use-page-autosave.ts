"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isApiError } from "@/lib/api-envelope";

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
  /** Latest revision the server has told us about, for optimistic concurrency. */
  contentRevision: number | undefined;
  save: (payload: SavePayload) => Promise<{ contentRevision: number }>;
  onConflict: (error: unknown) => void;
  onSaveError: (error: unknown) => void;
  delayMs?: number;
}

/**
 * The wiki editor's autosave, extracted so the three ways it silently discarded
 * edits can be tested.
 *
 *  (a) MERGE. `handleTitleChange` scheduled `{title}` and `handleEditorChange`
 *      scheduled `{content, contentText}` through ONE timer, and the second call
 *      cleared the first and queued a payload containing only its own fields.
 *      Rename a page and then type in the body inside the debounce window — the
 *      ordinary create-and-write flow — and the rename was never sent, while the
 *      title kept rendering from local draft state so nothing looked wrong until
 *      a reload. Patches now accumulate in one pending object that the single
 *      timer drains.
 *
 *  (b) FLUSH. The unmount cleanup only cleared the timer. Two paragraphs and a
 *      Cmd-W with the state still "pending" and the work was gone. The pending
 *      patch is now flushed on unmount, on `visibilitychange` -> hidden and on
 *      `pagehide` — the two events that actually fire when a tab is closed or
 *      backgrounded.
 *
 *  (c) CONFLICT. A 409 latched a ref that blocked every later autosave, and the
 *      only way out was a toast action; dismiss the toast and the editor kept
 *      accepting keystrokes, reporting "idle", saving nothing. The latch is now
 *      also STATE, so the surface can render a standing banner for as long as it
 *      holds.
 *
 * A failed save also puts its patch back rather than dropping it, so the next
 * keystroke re-sends it merged with whatever came after.
 */
export function usePageAutosave({
  pageId,
  contentRevision,
  save,
  onConflict,
  onSaveError,
  delayMs = PAGE_AUTOSAVE_DELAY_MS,
}: UsePageAutosaveArgs) {
  const [saveState, setSaveState] = useState<PageSaveState>("idle");
  const [conflict, setConflict] = useState(false);

  const conflictRef = useRef(false);
  const pendingPatchRef = useRef<PageAutosavePatch | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Tagged with the page it belongs to. An untagged revision was clobbered by
   * whichever effect happened to run last on mount, and — worse — could have
   * been carried from the page just left onto the page just opened, where it
   * would arrive as a spurious 409.
   */
  const revisionRef = useRef<{ pageId: number; value: number } | null>(null);
  const pageIdRef = useRef(pageId);
  const mountedRef = useRef(true);

  /**
   * Declared first so its cleanup runs before the flush cleanup below: the
   * unmount flush still fires its request, it just stops trying to report
   * progress into a component that is gone.
   */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Latest-value refs, written after commit rather than during render so
   * `schedule`/`flush` can be stable and the listener effect subscribes once.
   */
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

  const run = useCallback((patch: PageAutosavePatch) => {
    const targetPageId = pageIdRef.current;
    const known = revisionRef.current;
    /**
     * The server requires the precondition, so a save with no known revision would 400 and
     * lose the edit. Hold the patch until the page's revision arrives instead of sending it.
     */
    if (known?.pageId !== targetPageId) {
      pendingPatchRef.current = { ...patch, ...(pendingPatchRef.current ?? {}) };
      setStateIfMounted("pending");
      return;
    }
    setStateIfMounted("saving");
    const payload: SavePayload = {
      pageId: targetPageId,
      ...patch,
      expectedContentRevision: known.value,
    };
    handlersRef.current
      .save(payload)
      .then((data) => {
        revisionRef.current = { pageId: targetPageId, value: data.contentRevision };
        setStateIfMounted("saved");
      })
      .catch((error: unknown) => {
        setStateIfMounted("idle");
        // Anything typed since this send wins, but the failed fields are not
        // thrown away — they ride along with the next save.
        pendingPatchRef.current = { ...patch, ...(pendingPatchRef.current ?? {}) };
        if (isApiError(error) && error.status === 409) {
          conflictRef.current = true;
          if (mountedRef.current) setConflict(true);
          handlersRef.current.onConflict(error);
          return;
        }
        handlersRef.current.onSaveError(error);
      });
  }, [setStateIfMounted]);

  const schedule = useCallback(
    (patch: PageAutosavePatch) => {
      if (conflictRef.current) {
        clearTimer();
        return;
      }
      pendingPatchRef.current = { ...(pendingPatchRef.current ?? {}), ...patch };
      setSaveState("pending");
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const queued = pendingPatchRef.current;
        pendingPatchRef.current = null;
        if (queued) run(queued);
      }, delayMs);
    },
    [clearTimer, delayMs, run],
  );

  const flush = useCallback(() => {
    clearTimer();
    if (conflictRef.current) return;
    const queued = pendingPatchRef.current;
    if (!queued) return;
    pendingPatchRef.current = null;
    run(queued);
  }, [clearTimer, run]);

  /**
   * Declared after `flush` so a patch typed before the page's revision arrived — which `run`
   * holds rather than sending unguarded — is drained the moment that revision lands.
   */
  useEffect(() => {
    if (contentRevision === undefined) return;
    const hadRevision = revisionRef.current?.pageId === pageId;
    revisionRef.current = { pageId, value: contentRevision };
    if (!hadRevision && pendingPatchRef.current !== null) flush();
  }, [pageId, contentRevision, flush]);

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

  /**
   * Switching pages inside the wiki does not unmount the editor — the parent
   * just hands down a new `pageId` — so the reset has to flush FIRST. The
   * cleanup runs while `pageIdRef` still points at the page being left, which is
   * the page the pending patch was typed on.
   */
  useEffect(() => {
    conflictRef.current = false;
    setConflict(false);
    pendingPatchRef.current = null;
    setSaveState("idle");
    pageIdRef.current = pageId;
    return flush;
  }, [pageId, flush]);

  const resolveConflict = useCallback(() => {
    conflictRef.current = false;
    setConflict(false);
    pendingPatchRef.current = null;
  }, []);

  return { saveState, conflict, schedule, resolveConflict };
}
