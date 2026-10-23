"use client";

import "@fortune-sheet/react/dist/index.css";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KbLoader2Icon } from "@/features/wiki/lib/kb-icons";
import type { KbWorkbook } from "@/hooks/api/kb/kb-pages-schema";
import {
  snapshotWorkbook,
  toFortuneSheets,
  type FortuneSheet,
} from "@/features/wiki/lib/kb-workbook-convert";
import PageEditConflict from "./page-edit-conflict";
import { useWorkbookAutosave } from "./use-workbook-autosave";
import "../wiki-document.css";

const FortuneWorkbook = dynamic(
  () => import("@fortune-sheet/react").then((m) => m.Workbook),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-full min-h-0 w-full flex-1 rounded-none" />
    ),
  },
);

const SPREADSHEET_PENDING_FIELDS = ["spreadsheet"];

const SAVE_LABELS = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save",
} as const;

interface PageSpreadsheetGridProps {
  pageId: number;
  pageTitle: string;
  workbook: KbWorkbook;
  contentRevision: number;
  isEditable: boolean;
  sheetsRef: MutableRefObject<FortuneSheet[] | null>;
  isReloading: boolean;
  onReload: () => void;
  onRefetchRevision: () => Promise<number | null>;
  saveStatusHost?: HTMLElement | null;
}

export default function PageSpreadsheetGrid({
  pageId,
  pageTitle,
  workbook,
  contentRevision,
  isEditable,
  sheetsRef,
  isReloading,
  onReload,
  onRefetchRevision,
  saveStatusHost,
}: PageSpreadsheetGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [initialSheets] = useState(() => toFortuneSheets(workbook.sheets));
  const [baseline] = useState(() => snapshotWorkbook(initialSheets));
  const { saveState, conflict, schedule, retry, overwrite } =
    useWorkbookAutosave({
      pageId,
      contentRevision,
      baseline,
    });

  const handleChange = useCallback(
    (sheets: FortuneSheet[]) => {
      sheetsRef.current = sheets;
      if (isEditable) schedule(sheets);
    },
    [isEditable, schedule, sheetsRef],
  );

  const handleKeepMine = useCallback(() => {
    const sheets = sheetsRef.current ?? initialSheets;
    const known = conflict?.currentContentRevision ?? null;
    const resolveRevision =
      known === null ? onRefetchRevision() : Promise.resolve(known);
    void resolveRevision.then(
      (revision) => {
        if (revision === null) {
          toast.error(
            "Couldn't load the latest spreadsheet version. Your edits are still here.",
          );
          return;
        }
        void overwrite(revision, sheets);
      },
      () => {
        toast.error(
          "Couldn't load the latest spreadsheet version. Your edits are still here.",
        );
      },
    );
  }, [
    conflict?.currentContentRevision,
    initialSheets,
    onRefetchRevision,
    overwrite,
    sheetsRef,
  ]);

  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });
    });
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const handleCompare = useCallback(
    () => Promise.resolve({ title: pageTitle, body: "" }),
    [pageTitle],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {conflict ? (
        <div className="mb-5">
          <PageEditConflict
            conflict={conflict}
            isReloading={isReloading}
            pendingFields={SPREADSHEET_PENDING_FIELDS}
            localTitle={pageTitle}
            localBody=""
            onKeepMine={handleKeepMine}
            onDiscardMine={onReload}
            onCompare={handleCompare}
          />
        </div>
      ) : null}
      {saveStatusHost && isEditable && saveState !== "idle"
        ? createPortal(
            <span
              className={`flex items-center gap-1 text-xs ${saveState === "error" ? "text-status-danger-ink" : "text-muted-foreground"}`}
              aria-live="polite"
            >
              {saveState === "saving" ? (
                <KbLoader2Icon className="h-3 w-3 animate-spin" />
              ) : null}
              <span>{SAVE_LABELS[saveState]}</span>
              {saveState === "error" && !conflict ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={retry}
                >
                  Retry
                </Button>
              ) : null}
            </span>,
            saveStatusHost,
          )
        : null}
      <div
        ref={gridRef}
        className="wiki-spreadsheet-grid relative flex min-h-0 w-full flex-1 flex-col overflow-hidden border-t border-border"
      >
        <FortuneWorkbook
          data={initialSheets}
          onChange={handleChange}
          allowEdit={isEditable}
          showToolbar={isEditable}
          showFormulaBar={isEditable}
          showSheetTabs
        />
      </div>
    </div>
  );
}
