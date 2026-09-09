"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Progress } from "@/components/ui/progress";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { parseCsv, CsvParseError } from "@/lib/csv-parse";
import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import {
  checksumOf,
  STAGE_CHUNK_SIZE,
  useCancelStagedImport,
  useOpenStagedImport,
  useProcessImportChunk,
  useStageImportRows,
  useStagedImportErrors,
  type StagedImportProgress,
  type StagedImportRowError,
  type StagedImportType,
} from "@/hooks/api/inventory/staged-import";

const ERROR_COLUMNS: DataTableColumn<StagedImportRowError>[] = [
  {
    key: "rowNumber",
    header: "Line",
    headerClassName: "w-20 text-right",
    className: "w-20 text-right font-mono tabular-nums",
    cell: (row) => row.rowNumber,
  },
  {
    key: "field",
    header: "Field",
    cell: (row) => <span className="text-dense text-muted-foreground">{row.field ?? "—"}</span>,
  },
  {
    key: "message",
    header: "Why it was rejected",
    cell: (row) => <span className="text-sm">{row.message ?? row.code ?? "Unknown reason"}</span>,
  },
];

type Phase = "ready" | "running" | "finished" | "failed";

/**
 * The resume loop, driven by a click rather than by an effect.
 *
 * Open the job, stage the file's rows in chunks, then call process until the
 * server says `finished`. Every step is a mutation the operator started, which
 * is why this is not a `useEffect` — an effect firing the loop would restart it
 * on every StrictMode double-invoke and on every re-render the parent causes.
 */
export function StagedImportRunner({
  file,
  importType,
  onDone,
}: {
  file: File;
  importType: StagedImportType;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [progress, setProgress] = useState<StagedImportProgress | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const open = useOpenStagedImport();
  const stage = useStageImportRows();
  const process = useProcessImportChunk();
  const cancel = useCancelStagedImport();

  const jobId = progress?.jobId ?? null;
  const errors = useStagedImportErrors(
    progress !== null && progress.failedRows > 0 ? progress.jobId : null,
  );
  const shownErrors = errors.data?.items.length ?? 0;
  const totalErrors = errors.data?.total ?? 0;

  const run = useCallback(async () => {
    setPhase("running");
    setFailure(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.rows.length === 0) throw new Error("This file has a header and no rows.");

      const rows = parsed.rows.map((cells, index) => ({
        // 1-based and counting the header, so an error cites the line a person
        // sees in their spreadsheet.
        rowNumber: index + 2,
        payload: Object.fromEntries(
          parsed.headers.map((header, column) => [header, cells[column] ?? ""]),
        ),
      }));

      const opened = await open.mutateAsync({
        importType,
        fileName: file.name,
        totalRows: rows.length,
        checksum: await checksumOf(file),
      });
      setProgress(opened);

      for (let start = 0; start < rows.length; start += STAGE_CHUNK_SIZE) {
        const staged = await stage.mutateAsync({
          jobId: opened.jobId,
          rows: rows.slice(start, start + STAGE_CHUNK_SIZE),
        });
        setProgress(staged);
      }

      let current = opened;
      // Bounded so a server that stops advancing ends the loop instead of
      // hammering the endpoint forever; the job stays resumable either way.
      for (let turn = 0; turn < 10_000; turn++) {
        current = await process.mutateAsync(opened.jobId);
        setProgress(current);
        if (current.finished || current.cancelled) break;
      }

      setPhase("finished");
      toast.success(
        current.failedRows === 0
          ? `Imported ${String(current.appliedRows)} of ${String(current.totalRows)} rows.`
          : `Imported ${String(current.appliedRows)} rows; ${String(current.failedRows)} were rejected.`,
      );
    } catch (error) {
      const message =
        error instanceof CsvParseError ? error.message : getErrorMessage(error);
      setFailure(message);
      setPhase("failed");
      toast.error(message);
    }
  }, [file, importType, open, process, stage]);

  function handleStart(): void {
    void run();
  }

  function handleCancel(): void {
    if (jobId === null) return;
    cancel.mutate(jobId, {
      onSuccess: (result) => {
        setProgress(result);
        setPhase("finished");
        toast.success("Import cancelled. Rows already applied stay applied.");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  const applied = progress?.appliedRows ?? 0;
  const total = progress?.totalRows ?? 0;
  const percent = total === 0 ? 0 : Math.round(((applied + (progress?.failedRows ?? 0)) / total) * 100);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {phase === "ready" ? (
          <LoadingButton isPending={false} onClick={handleStart}>
            Import all rows
          </LoadingButton>
        ) : null}
        {phase === "running" ? (
          <>
            <LoadingButton isPending loadingText="Importing…">
              Importing…
            </LoadingButton>
            <Button variant="outline" onClick={handleCancel} disabled={jobId === null}>
              Stop
            </Button>
          </>
        ) : null}
        {phase === "finished" || phase === "failed" ? (
          <Button variant="outline" onClick={onDone}>
            Import another file
          </Button>
        ) : null}
        {phase === "failed" && jobId !== null ? (
          <LoadingButton isPending={false} onClick={handleStart}>
            Resume
          </LoadingButton>
        ) : null}
      </div>

      {progress !== null ? (
        <div className="space-y-2">
          <Progress value={percent} />
          <div className="flex flex-wrap gap-4 text-dense text-muted-foreground">
            <span>
              <span className="font-mono tabular-nums text-foreground">{progress.stagedRows}</span>{" "}
              staged of {progress.totalRows}
            </span>
            <span>
              <span className="font-mono tabular-nums text-foreground">{progress.appliedRows}</span>{" "}
              applied
            </span>
            <span
              className={cn(
                "rounded-md border px-2 py-0.5",
                statusToneClasses(progress.failedRows > 0 ? "danger" : "neutral"),
              )}
            >
              <span className="font-mono tabular-nums">{progress.failedRows}</span> rejected
            </span>
            {progress.cancelled ? <span>Cancelled — applied rows were kept</span> : null}
          </div>
        </div>
      ) : null}

      {phase === "failed" && failure !== null ? (
        <ErrorState
          title="The import stopped"
          description={`${failure} Rows already applied stay applied; Resume picks up from the next unprocessed row.`}
          onRetry={handleStart}
        />
      ) : null}

      {progress !== null && progress.failedRows > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Rows the import rejected</p>
          {errors.isError ? (
            <ErrorState
              title="Couldn't load the rejected rows"
              description={getErrorMessage(errors.error)}
              onRetry={() => void errors.refetch()}
            />
          ) : (
            <>
              <DataTable
                data={errors.data?.items ?? []}
                columns={ERROR_COLUMNS}
                getRowKey={(row) => row.rowNumber}
                isLoading={errors.isLoading}
                emptyState={
                  <InventoryEmptyState
                    illustrationPreset="default"
                    title="No detail was recorded"
                    description="The job counted rejected rows but stored no reason for them."
                    compact
                  />
                }
              />
              {shownErrors > 0 && totalErrors > shownErrors ? (
                <p className="text-dense text-muted-foreground">
                  Showing the first{" "}
                  <span className="font-mono tabular-nums">{shownErrors}</span> of{" "}
                  <span className="font-mono tabular-nums">{totalErrors}</span> rejected rows.
                  Fix these, re-stage, and the next run reports what is left.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
