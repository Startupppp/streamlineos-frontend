"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ErrorReference } from "@/components/shared/error-reference";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCan } from "@/hooks/api/access";
import { useBackfillDocuments, type DocumentBackfillPage } from "@/hooks/api/hr/document-backfill";
import { getErrorMessage } from "@/lib/get-error-message";
import { AUDIENCE_LABEL, EMPTY_TOTALS, addPage, documentsWord, skippedLines, type BackfillTotals } from "./document-backfill-model";

type Mode = "preview" | "apply";
type Status = "running" | "done" | "stopped" | "failed";

interface Run {
  mode: Mode;
  status: Status;
  totals: BackfillTotals;
  /** The last document id handled; a run that stopped carries on from here. */
  cursor: number;
  error: unknown;
}

/** A page that neither finished the scan nor moved past the cursor would loop forever; stop it instead. */
function advanced(page: DocumentBackfillPage, cursor: number): boolean {
  return page.done || (page.nextCursor !== null && page.nextCursor > cursor);
}

function Sample({ totals }: { totals: BackfillTotals }) {
  if (totals.sample.length === 0) return null;
  const more = totals.eligible - totals.sample.length;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-foreground">Some of the documents</p>
      <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        {totals.sample.map((entry) => (
          <li key={entry.documentId} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate">{entry.name}</span>
            <span className="shrink-0">{AUDIENCE_LABEL[entry.audience]}</span>
          </li>
        ))}
      </ul>
      {more > 0 ? <p className="text-xs text-muted-foreground">and {more} more.</p> : null}
    </div>
  );
}

function Skipped({ totals }: { totals: BackfillTotals }) {
  const lines = skippedLines(totals.skipped);
  if (lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-foreground">Left alone</p>
      <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function summaryOf(run: Run): string {
  const { totals } = run;
  if (run.mode === "apply") {
    return totals.applied === 0
      ? `Checked ${documentsWord(totals.scanned)}; none needed classifying.`
      : `Classified ${documentsWord(totals.applied)}. None was added to the Knowledge Base: use "Classification and sharing" on a document to add it.`;
  }
  if (totals.eligible === 0) return `Checked ${documentsWord(totals.scanned)}; none needs classifying.`;
  return `${documentsWord(totals.eligible)} of ${totals.scanned} look like company documents: ${totals.allEmployees} would be ${AUDIENCE_LABEL.ALL_EMPLOYEES.toLowerCase()} and ${totals.hrOnly} ${AUDIENCE_LABEL.HR_ONLY.toLowerCase()}.`;
}

/**
 * Every existing HR document starts as Personal, so without this HR would classify each policy by hand. This
 * previews which documents look like company documents (a preview changes nothing), and then applies it: a
 * document employees could already read becomes Internal for all employees, any other becomes Internal for HR
 * only. Nothing is added to the Knowledge Base, nothing HR already decided is changed, and personal documents
 * are never touched. It walks the library a page at a time, so it can be stopped, and it carries on from where
 * it stopped. For the person who may publish documents, and only while sharing is on.
 */
export function DocumentBackfillPanel() {
  const canPublish = useCan("hr:documents:publish");
  const backfill = useBackfillDocuments();
  const [run, setRun] = useState<Run | null>(null);
  const [confirming, setConfirming] = useState(false);
  // What the dialog states is fixed when it is opened, so it does not change while the run it starts replaces the preview.
  const [dialogTotals, setDialogTotals] = useState<BackfillTotals>(EMPTY_TOTALS);
  const stopRequested = useRef(false);

  useEffect(
    () => () => {
      stopRequested.current = true;
    },
    [],
  );

  const execute = useCallback(
    async (mode: Mode, startCursor: number, startTotals: BackfillTotals) => {
      stopRequested.current = false;
      let cursor = startCursor;
      let totals = startTotals;
      setRun({ mode, status: "running", totals, cursor, error: null });
      try {
        for (;;) {
          // One page at a time by design: each page is its own request and its own transaction, and its cursor is the last page's answer.
          const page = await backfill.mutateAsync({ dryRun: mode === "preview", cursor });
          totals = addPage(totals, page);
          if (!advanced(page, cursor)) throw new Error("The server did not move on to the next documents.");
          cursor = page.nextCursor ?? cursor;
          if (page.done) {
            setRun({ mode, status: "done", totals, cursor, error: null });
            if (mode === "apply") toast.success(totals.applied === 0 ? "No document needed classifying." : `Classified ${documentsWord(totals.applied)}.`);
            return;
          }
          if (stopRequested.current) {
            setRun({ mode, status: "stopped", totals, cursor, error: null });
            return;
          }
          setRun({ mode, status: "running", totals, cursor, error: null });
        }
      } catch (error) {
        setRun({ mode, status: "failed", totals, cursor, error });
        toast.error(getErrorMessage(error));
      }
    },
    [backfill],
  );

  const handlePreview = useCallback(() => void execute("preview", 0, EMPTY_TOTALS), [execute]);
  const handleStop = useCallback(() => {
    stopRequested.current = true;
  }, []);
  const handleAskApply = useCallback(() => {
    if (run?.mode !== "preview" || run.status !== "done") return;
    setDialogTotals(run.totals);
    setConfirming(true);
  }, [run]);
  const handleConfirmChange = useCallback((open: boolean) => setConfirming(open), []);
  const handleApply = useCallback(() => void execute("apply", 0, EMPTY_TOTALS), [execute]);
  const handleResume = useCallback(() => {
    if (run) void execute(run.mode, run.cursor, run.totals);
  }, [execute, run]);
  const handleStartOver = useCallback(() => setRun(null), []);

  if (!canPublish) return null;

  const running = run?.status === "running";
  const previewed = run?.mode === "preview" && run.status === "done" ? run.totals : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Classify the documents you already have</p>
          <p className="text-xs text-muted-foreground">
            Every existing document starts as Personal. Preview which ones look like company documents; a preview changes nothing.
          </p>
        </div>
        {running ? (
          <Button type="button" variant="outline" size="sm" onClick={handleStop}>
            Stop
          </Button>
        ) : run === null || run.status === "done" ? (
          <Button type="button" variant="outline" size="sm" onClick={handlePreview}>
            {run === null ? "Preview" : "Preview again"}
          </Button>
        ) : null}
      </div>

      {running ? (
        <p role="status" className="text-xs text-muted-foreground">
          {run.mode === "preview" ? "Checking" : "Classifying"}: {documentsWord(run.totals.scanned)} checked so far.
        </p>
      ) : null}

      {run !== null && run.status === "done" ? (
        <div className="flex flex-col gap-3" role="status">
          <p className="text-sm text-foreground">{summaryOf(run)}</p>
          {run.mode === "preview" ? <Sample totals={run.totals} /> : null}
          <Skipped totals={run.totals} />
          {previewed !== null && previewed.eligible > 0 ? (
            <div>
              <Button type="button" size="sm" onClick={handleAskApply}>
                Classify {documentsWord(previewed.eligible)}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {run !== null && run.status === "stopped" ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-foreground">
            Stopped after {documentsWord(run.totals.scanned)}.
            {run.mode === "apply" ? ` ${documentsWord(run.totals.applied)} classified so far.` : ""}
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleResume}>
              Continue
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleStartOver}>
              Start over
            </Button>
          </div>
        </div>
      ) : null}

      {run !== null && run.status === "failed" ? (
        <Alert variant="destructive">
          <AlertTitle>{run.mode === "apply" ? "Stopped before it finished" : "The preview did not finish"}</AlertTitle>
          <AlertDescription>
            <p>{getErrorMessage(run.error)}</p>
            {run.mode === "apply" ? <p className="mt-1">{documentsWord(run.totals.applied)} classified before it stopped. Continuing picks up from there.</p> : null}
            <ErrorReference error={run.error} className="mt-2 justify-start" />
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" onClick={handleResume}>
                Try again
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleStartOver}>
                Start over
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <ConfirmDialog
        open={confirming}
        onOpenChange={handleConfirmChange}
        title={`Classify ${documentsWord(dialogTotals.eligible)}?`}
        description={`${dialogTotals.allEmployees} will be ${AUDIENCE_LABEL.ALL_EMPLOYEES.toLowerCase()} and ${dialogTotals.hrOnly} ${AUDIENCE_LABEL.HR_ONLY.toLowerCase()}. Nothing is added to the Knowledge Base, nothing HR has already classified is changed, and personal documents are never touched. You can change any of them afterwards.`}
        confirmLabel="Classify"
        onConfirm={handleApply}
      />
    </div>
  );
}
