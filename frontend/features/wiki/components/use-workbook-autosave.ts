"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { useReplaceKbWorkbook, useUpdateKbWorkbook } from "@/hooks/api/kb/workbook";
import type { KbWorkbookSheet } from "@/hooks/api/kb/kb-pages-schema";
import {
  kbPageEditConflictContract,
  UNATTRIBUTED_PAGE_EDIT_CONFLICT,
  type KbPageEditConflict,
} from "@/features/wiki/lib/wiki-schema";
import {
  diffWorkbook,
  snapshotWorkbook,
  toSheetInputs,
  type FortuneSheet,
} from "@/features/wiki/lib/kb-workbook-convert";

const WORKBOOK_SAVE_DELAY = 1500;

export type WorkbookSaveState = "idle" | "saving" | "saved" | "error";

interface UseWorkbookAutosaveOptions {
  pageId: number;
  contentRevision: number;
  baseline: KbWorkbookSheet[];
}

export function useWorkbookAutosave({ pageId, contentRevision, baseline }: UseWorkbookAutosaveOptions) {
  const { mutateAsync: patchWorkbook } = useUpdateKbWorkbook();
  const { mutateAsync: putWorkbook } = useReplaceKbWorkbook();
  const [saveState, setSaveState] = useState<WorkbookSaveState>("idle");
  const [conflict, setConflict] = useState<KbPageEditConflict | null>(null);
  const savedRef = useRef(baseline);
  const revisionRef = useRef(contentRevision);
  const latestRef = useRef<FortuneSheet[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const dirtyRef = useRef(false);
  const conflictRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (contentRevision > revisionRef.current) revisionRef.current = contentRevision;
  }, [contentRevision]);

  const send = useCallback(
    async (next: KbWorkbookSheet[], forceReplace: boolean) => {
      const operations = forceReplace ? null : diffWorkbook(savedRef.current, next);
      if (operations !== null && operations.length === 0) return;
      const base = { pageId, expectedContentRevision: revisionRef.current, savedSheets: next };
      const res =
        operations === null
          ? await putWorkbook({ ...base, sheets: toSheetInputs(next) })
          : await patchWorkbook({ ...base, operations });
      savedRef.current = next;
      revisionRef.current = res.contentRevision;
    },
    [pageId, patchWorkbook, putWorkbook],
  );

  const flush = useCallback(async () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const latest = latestRef.current;
    if (latest === null || conflictRef.current) return;
    if (inFlightRef.current) {
      dirtyRef.current = true;
      return;
    }
    latestRef.current = null;
    inFlightRef.current = true;
    if (mountedRef.current) setSaveState("saving");
    try {
      await send(snapshotWorkbook(latest), false);
      if (mountedRef.current) setSaveState("saved");
    } catch (error) {
      latestRef.current = latestRef.current ?? latest;
      if (isApiError(error) && error.status === 409) {
        const parsed = kbPageEditConflictContract.safeParse(error.details);
        conflictRef.current = true;
        if (mountedRef.current) {
          setConflict(parsed.success ? parsed.data : UNATTRIBUTED_PAGE_EDIT_CONFLICT);
          setSaveState("error");
        }
      } else if (mountedRef.current) {
        setSaveState("error");
        toast.error("Spreadsheet save failed", { description: getErrorMessage(error) });
      }
    } finally {
      inFlightRef.current = false;
    }
    if (dirtyRef.current && !conflictRef.current) {
      dirtyRef.current = false;
      void flush();
    }
  }, [send]);

  const schedule = useCallback(
    (sheets: FortuneSheet[]) => {
      latestRef.current = sheets;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void flush();
      }, WORKBOOK_SAVE_DELAY);
    },
    [flush],
  );

  const retry = useCallback(() => {
    void flush();
  }, [flush]);

  const overwrite = useCallback(
    async (latestRevision: number, sheets: FortuneSheet[]) => {
      revisionRef.current = latestRevision;
      latestRef.current = null;
      dirtyRef.current = false;
      inFlightRef.current = true;
      setSaveState("saving");
      try {
        await send(snapshotWorkbook(sheets), true);
        conflictRef.current = false;
        if (mountedRef.current) {
          setConflict(null);
          setSaveState("saved");
        }
      } catch (error) {
        if (mountedRef.current) {
          setSaveState("error");
          toast.error("Spreadsheet save failed", { description: getErrorMessage(error) });
        }
      } finally {
        inFlightRef.current = false;
      }
    },
    [send],
  );

  useEffect(() => {
    mountedRef.current = true;
    function handleHidden() {
      if (document.visibilityState === "hidden") void flush();
    }
    document.addEventListener("visibilitychange", handleHidden);
    return () => {
      document.removeEventListener("visibilitychange", handleHidden);
      mountedRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (latestRef.current !== null && !conflictRef.current) void flush();
    };
  }, [flush]);

  return { saveState, conflict, schedule, retry, overwrite };
}
