"use client";

import "@fortune-sheet/react/dist/index.css";
import { useCallback, useState, type MutableRefObject } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { KbWorkbook } from "@/hooks/api/kb/kb-pages-schema";
import {
  snapshotWorkbook,
  toFortuneSheets,
  type FortuneSheet,
} from "@/features/wiki/lib/kb-workbook-convert";
import PageEditConflict from "./page-edit-conflict";
import { useWorkbookAutosave } from "./use-workbook-autosave";

const FortuneWorkbook = dynamic(
  () => import("@fortune-sheet/react").then((m) => m.Workbook),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-full min-h-[400px] w-full rounded-lg" />
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
}: PageSpreadsheetGridProps) {
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

  const handleCompare = useCallback(
    () => Promise.resolve({ title: pageTitle, body: "" }),
    [pageTitle],
  );

  return (
    <>
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
      {isEditable && saveState !== "idle" ? (
        <div
          className="mb-2 flex items-center justify-end gap-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <span>{SAVE_LABELS[saveState]}</span>
          {saveState === "error" && !conflict ? (
            <Button type="button" size="sm" variant="ghost" onClick={retry}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
        <FortuneWorkbook
          data={initialSheets}
          onChange={handleChange}
          allowEdit={isEditable}
          showToolbar={isEditable}
          showFormulaBar={isEditable}
          showSheetTabs
        />
      </div>
    </>
  );
}
