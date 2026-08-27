"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { FileUp, Undo2, Upload } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { useCommitImport, usePreviewImport, useRevertImport } from "@/hooks/api/crm/import";
import { useSubjectTypes } from "@/hooks/api/party/subjects";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ImportPreview, ImportProgress, PlannedEntity } from "@/types/crm/import";
import { PLANNED_ENTITIES, needsSubjectType, plannedEntity } from "./planned-entities";
import { ColumnMappingReview } from "./column-mapping-review";
import {
  IMPORT_FILE_ACCEPT,
  ImportFileError,
  isReadableImportFile,
  readImportFile,
  type ImportFileContents,
} from "./import-file";

/** A file this size is a paste, not a migration; the connectors are Phase 2. */
const MAX_ROWS = 5_000;

/**
 * Bringing a file in, planned on the server.
 *
 * The one import on this page with a plan behind it: the server decides what
 * every row would do before anything is written, the commit runs as a durable
 * job, and the whole thing can be taken back afterwards.
 *
 * The entity is chosen here rather than guessed from the file. A deals export
 * and a contacts export share most of their headers — `Name`, `Owner`, `Stage`
 * against `Name`, `Owner`, `Status` — so inferring the target from the columns
 * gets it wrong on exactly the files people actually have, and gets it wrong
 * silently: the preview would look reasonable and land a thousand opportunities
 * as companies. Asking is one click and cannot be misread.
 */
export function PlannedImportSection() {
  const [entity, setEntity] = useState<PlannedEntity>("party");
  const [subjectTypeId, setSubjectTypeId] = useState<string>("");
  const [parsed, setParsed] = useState<ImportFileContents | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  /**
   * The answers the *current* preview was actually built from.
   *
   * Committing sends nothing but `crmImportId` — the server replays the plan it
   * persisted at preview time, and overrides are applied only while planning.
   * So a choice made after the preview returned has not reached the plan, and
   * without this the local `overrides` would vouch for a plan that never saw
   * them: the mapping panel says "You chose Email", the commit button enables,
   * and the import runs with that column still unmapped.
   */
  const [previewOverrides, setPreviewOverrides] = useState<Record<string, string>>({});
  const [committed, setCommitted] = useState<ImportProgress | null>(null);
  const [isReading, setIsReading] = useState(false);
  /**
   * How far a multi-call commit has got.
   *
   * A large file is committed across several requests under a server-side time
   * budget, and a progress bar that sits at "importing…" for four minutes looks
   * indistinguishable from one that has hung.
   */
  const [progress, setProgress] = useState<{ done: number; remaining: number } | null>(null);

  /*
    An entity nobody may write is not offered. The server checks the same key on
    top of `crm:imports:manage`, so a control left visible here would fail there.
  */
  const canParty = useCan("party:parties:create");
  const canSubject = useCan("party:subjects:manage");
  const canPipeline = useCan("crm:deals:create");
  const canActivity = useCan("crm:activities:manage");
  const allowed: Record<PlannedEntity, boolean> = {
    party: canParty,
    subject: canSubject,
    pipeline: canPipeline,
    activity: canActivity,
  };
  const offered = PLANNED_ENTITIES.filter((option) => allowed[option.id]);

  const subjectTypes = useSubjectTypes({ enabled: needsSubjectType(entity) });
  const subjectTypeList = subjectTypes.data?.data ?? [];

  const previewImport = usePreviewImport();
  const commitImport = useCommitImport();
  const revertImport = useRevertImport();

  /**
   * What is still unanswered, taken from the server rather than from local
   * state. `applyOverrides` rewrites an answered column to `mapped`, and
   * `needsConfirmation` reports only the `ambiguous` ones — so the plan itself
   * is the honest account of what is still open.
   */
  const unanswered = preview?.needsConfirmation ?? [];
  /** Answers have moved on since this plan was built, so it no longer describes what would happen. */
  const choicesChanged = preview !== null && !sameAnswers(overrides, previewOverrides);

  const openFile = useCallback(async (file: File) => {
    // A new file invalidates everything staged for the old one. Cleared up
    // front so that every early return below leaves nothing behind — a rejected
    // file used to leave the previous one loaded and importable, under the new
    // file's name in the user's mind.
    setParsed(null);
    setPreview(null);
    setPreviewOverrides({});
    setCommitted(null);
    setOverrides({});
    setIsReading(true);

    try {
      const opened = await readImportFile(file);
      if (opened.rows.length > MAX_ROWS) {
        toast.error(`That file has ${opened.rows.length} rows; ${MAX_ROWS} is the most this handles.`);
        return;
      }
      setParsed(opened);
    } catch (error) {
      // A file that cannot be parsed unambiguously is refused outright.
      // Importing an approximation of someone's data is worse than not
      // importing it, because nothing downstream would reveal the difference.
      toast.error(error instanceof ImportFileError ? error.message : getErrorMessage(error));
    } finally {
      setIsReading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (!file) return;
      if (!isReadableImportFile(file.name)) {
        toast.error("Drop a .csv or .xlsx file.");
        return;
      }
      void openFile(file);
    },
    [openFile],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => event.preventDefault(), []);

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void openFile(file);
    },
    [openFile],
  );

  /**
   * Changing the target throws the plan away.
   *
   * A plan is built for one entity: its column mapping, its duplicate matching
   * and its per-row verdicts are all that entity's. Left on screen after the
   * target changed, the commit button would still be live and would send a
   * `crmImportId` the server planned as something else.
   */
  const handleEntityChange = useCallback((value: string) => {
    setEntity(value as PlannedEntity);
    setPreview(null);
    setPreviewOverrides({});
    setOverrides({});
    setCommitted(null);
  }, []);

  const handleSubjectTypeChange = useCallback((value: string) => {
    setSubjectTypeId(value);
    setPreview(null);
    setPreviewOverrides({});
    setCommitted(null);
  }, []);

  const handleOverride = useCallback(
    (header: string, field: string) =>
      setOverrides((current) => ({ ...current, [header]: field })),
    [],
  );

  const handlePreview = useCallback(() => {
    if (!parsed) return;
    // Captured rather than read at settle time: the answers this plan is built
    // from are the ones sent with it, not whatever state holds when it returns.
    const sent = overrides;
    previewImport.mutate(
      {
        filename: parsed.filename,
        entity,
        subjectTypeId: needsSubjectType(entity) ? subjectTypeId : undefined,
        headers: parsed.headers,
        rows: parsed.rows,
        overrides: Object.keys(sent).length > 0 ? sent : undefined,
      },
      {
        onSuccess: (result) => {
          setPreview(result);
          setPreviewOverrides(sent);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [parsed, overrides, previewImport, entity, subjectTypeId]);

  const handleCommit = useCallback(() => {
    if (!preview || choicesChanged) return;
    setProgress(null);
    commitImport.mutate(
      {
        crmImportId: preview.crmImportId,
        onProgress: (soFar) =>
          setProgress({
            done: soFar.created + soFar.updated + soFar.merged + soFar.skipped + soFar.failed,
            remaining: soFar.remaining,
          }),
      },
      {
        onSuccess: (result) => {
          setProgress(null);
          setCommitted(result);
          const parts = [`${result.created} created`, `${result.updated} updated`];
          if (result.merged > 0) parts.push(`${result.merged} folded into rows above`);
          // Not written, and the reason a person needs to know: they are waiting
          // in the data quality queue for somebody's judgement, not lost.
          if (result.review > 0) parts.push(`${result.review} sent for review`);
          if (result.failed > 0) parts.push(`${result.failed} could not be read`);
          toast.success(parts.join(", "));
        },
        onError: (error) => {
          setProgress(null);
          toast.error(getErrorMessage(error));
        },
      },
    );
  }, [preview, choicesChanged, commitImport]);

  const handleRevert = useCallback(() => {
    if (!committed) return;
    revertImport.mutate(committed.crmImportId, {
      onSuccess: (result) => {
        // Revert returns the same job shape as commit now, so what came back is
        // a count of rows undone rather than two separate tallies.
        toast.success(`Undone — ${result.reverted} of ${result.total} rows put back as they were`);
        setCommitted(null);
        setPreview(null);
        setParsed(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [committed, revertImport]);

  return (
    <div className="flex flex-col gap-gap-section">
      <Card>
        <CardHeader>
          <CardTitle>Bring your data in</CardTitle>
          <CardDescription>
            Export your accounts or companies from your current CRM as a CSV or Excel file and drop
            it here. Nothing is created until you say so, and you can undo the whole thing
            afterwards.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-gap-toolbar">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="import-entity" className="text-label font-medium">
                What is in this file?
              </Label>
              <Select value={entity} onValueChange={handleEntityChange}>
                <SelectTrigger id="import-entity" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {offered.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsSubjectType(entity) ? (
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Label htmlFor="import-subject-type" className="text-label font-medium">
                  Which kind of subject?
                </Label>
                <Select value={subjectTypeId} onValueChange={handleSubjectTypeChange}>
                  <SelectTrigger id="import-subject-type" className="w-full">
                    <SelectValue placeholder="Choose a type" />
                  </SelectTrigger>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    {subjectTypeList.map((type) => (
                      <SelectItem key={type.subjectTypeId} value={type.subjectTypeId}>
                        {type.plural}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <p className="text-micro text-muted-foreground">{plannedEntity(entity).hint}</p>

          {needsSubjectType(entity) && subjectTypeList.length === 0 && !subjectTypes.isLoading ? (
            <p role="alert" className={cn("text-label", statusToneClasses("warning").ink)}>
              Your organisation has not declared a subject type yet, so there is nothing to import
              these rows as.
            </p>
          ) : null}

          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="rounded-md border border-dashed border-border p-6 text-center transition-colors hover:border-ring"
          >
            <FileUp className="mx-auto mb-2 size-8 text-muted-foreground" aria-hidden />
            <Label htmlFor="import-file" className="justify-center text-label font-medium">
              Drop your file here, or choose one
            </Label>
            <input
              id="import-file"
              type="file"
              accept={IMPORT_FILE_ACCEPT}
              className="mx-auto mt-2 block w-full max-w-sm text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-card file:px-3 file:py-1.5 file:text-sm"
              onChange={handleFileInputChange}
            />
            <p className="mt-2 text-micro text-muted-foreground">.csv or .xlsx</p>
          </div>

          {isReading ? (
            <p aria-live="polite" className="text-label text-muted-foreground">
              Reading your file…
            </p>
          ) : parsed ? (
            <p className="text-label text-muted-foreground">
              {parsed.filename} — {parsed.rows.length} {parsed.rows.length === 1 ? "row" : "rows"},{" "}
              {parsed.headers.length} columns
            </p>
          ) : null}

          {parsed && parsed.rows.length === 0 ? (
            <p role="alert" className={cn("text-label", statusToneClasses("warning").ink)}>
              That file has a header row and nothing under it, so there is nothing to import.
            </p>
          ) : null}

          {parsed && parsed.rows.length > 0 && !committed ? (
            <LoadingButton
              type="button"
              className="self-start"
              isPending={previewImport.isPending}
              disabled={needsSubjectType(entity) && !subjectTypeId}
              onClick={handlePreview}
            >
              <Upload className="mr-1.5 size-4" aria-hidden />
              {preview ? "Check again" : "See what would happen"}
            </LoadingButton>
          ) : null}
        </CardContent>
      </Card>

      {preview && !committed ? (
        <>
          <ColumnMappingReview
            columns={preview.columns}
            overrides={overrides}
            onOverride={handleOverride}
          />

          <Card>
            <CardHeader>
              <CardTitle>What this would do</CardTitle>
              <CardDescription>
                Exactly this, and nothing else. Committing runs the plan below.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-gap-toolbar">
              {/* The plan's own reservations, shown because the tenant is about
                  to approve it. */}
              {preview.warnings.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {preview.warnings.map((warning) => (
                    <li key={warning} role="alert" className="text-label text-status-warning-ink">
                      {warning}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-wrap gap-gap-grid">
                <Summary label="Created" value={preview.summary.create} tone="success" />
                <Summary label="Updated" value={preview.summary.update} tone="info" />
                <Summary label="Merged" value={preview.summary.merge} tone="info" />
                <Summary label="For review" value={preview.summary.review} tone="warning" />
                <Summary label="Skipped" value={preview.summary.skip} tone="neutral" />
              </div>

              {/* A sample. Shipping ten thousand rows to a browser is a preview
                  nobody waits for. */}
              <ul className="max-h-72 overflow-y-auto rounded-md border border-border">
                {preview.rows.map((row) => (
                  <li
                    key={row.rowNumber}
                    className="flex flex-wrap items-baseline gap-x-2 border-b border-border px-3 py-2 text-label last:border-b-0"
                  >
                    <span className="tabular-nums text-muted-foreground">Row {row.rowNumber}</span>
                    <span className={cn("font-medium", toneFor(row.action))}>{row.action}</span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{row.reason}</span>
                  </li>
                ))}
              </ul>

              {choicesChanged ? (
                <p role="alert" className="text-label text-status-warning-ink">
                  Your column choices changed. Check again to see what they would do — this plan
                  was built before them.
                </p>
              ) : unanswered.length > 0 ? (
                <p role="alert" className="text-label text-status-warning-ink">
                  Answer {unanswered.length} {unanswered.length === 1 ? "column" : "columns"} above,
                  then check again.
                </p>
              ) : null}

              {progress ? (
                <p aria-live="polite" className="text-label text-muted-foreground">
                  {progress.done} done, {progress.remaining} to go. This runs on the server and
                  carries on if you leave — reopen the import to see where it got to.
                </p>
              ) : null}

              <LoadingButton
                type="button"
                className="self-start"
                isPending={commitImport.isPending}
                disabled={unanswered.length > 0 || choicesChanged || preview.summary.total === 0}
                onClick={handleCommit}
              >
                Import {preview.summary.create + preview.summary.update} records
              </LoadingButton>
            </CardContent>
          </Card>
        </>
      ) : null}

      {committed ? (
        <Card className="border-status-success-rule">
          <CardHeader>
            <CardTitle>Imported</CardTitle>
            <CardDescription>
              {committed.created} created, {committed.updated} updated. If it is not what you
              wanted, take the whole thing back — records it created are removed and records it
              changed go back exactly as they were.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingButton
              type="button"
              variant="outline"
              isPending={revertImport.isPending}
              onClick={handleRevert}
            >
              <Undo2 className="mr-1.5 size-4" aria-hidden />
              Undo this import
            </LoadingButton>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/**
 * Whether two sets of column answers are the same.
 *
 * A shallow compare is exactly right: the values are field names chosen from a
 * fixed list, so there is nothing nested to miss.
 */
function sameAnswers(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => a[key] === b[key]);
}

function toneFor(action: string): string {
  if (action === "create") return statusToneClasses("success").ink;
  if (action === "update") return statusToneClasses("info").ink;
  return statusToneClasses("neutral").ink;
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "info" | "warning" | "neutral";
}) {
  return (
    <div>
      <p className="text-micro text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-medium tabular-nums", statusToneClasses(tone).ink)}>{value}</p>
    </div>
  );
}
