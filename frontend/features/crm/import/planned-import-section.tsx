"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { FileUp, Upload } from "lucide-react";
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
import { ImportPreviewCard } from "./import-preview-card";
import { ImportCommittedCard } from "./import-committed-card";
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
        <ImportPreviewCard
          preview={preview}
          overrides={overrides}
          choicesChanged={choicesChanged}
          unanswered={unanswered}
          progress={progress}
          commitIsPending={commitImport.isPending}
          onOverride={handleOverride}
          onCommit={handleCommit}
        />
      ) : null}

      {committed ? (
        <ImportCommittedCard
          committed={committed}
          revertIsPending={revertImport.isPending}
          onRevert={handleRevert}
        />
      ) : null}
    </div>
  );
}

function sameAnswers(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => a[key] === b[key]);
}
