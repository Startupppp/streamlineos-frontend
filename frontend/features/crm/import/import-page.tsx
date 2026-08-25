"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Undo2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useCan } from "@/hooks/api/access";
import {
  downloadExport,
  useCommitImport,
  usePreviewImport,
  useRevertImport,
} from "@/hooks/api/crm/import";
import { CsvParseError, parseCsv } from "@/lib/csv-parse";
import { getErrorMessage } from "@/lib/get-error-message";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { EXPORT_ENTITIES, type ImportPreview, type ImportProgress } from "@/types/crm/import";
import { ColumnMappingReview } from "./column-mapping-review";

/** A file this size is a paste, not a migration; the connectors are Phase 2. */
const MAX_ROWS = 5_000;

export function CrmImportPage() {
  const canImport = useCan("crm:imports:manage");

  const [parsed, setParsed] = useState<{ filename?: string; headers: string[]; rows: string[][] } | null>(null);
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
  /**
   * How far a multi-call commit has got.
   *
   * A large file is committed across several requests under a server-side time
   * budget, and a progress bar that sits at "importing…" for four minutes looks
   * indistinguishable from one that has hung.
   */
  const [progress, setProgress] = useState<{ done: number; remaining: number } | null>(null);

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

  function readFile(file: File) {
    // A new file invalidates everything staged for the old one. Cleared up
    // front so that every early return below leaves nothing behind — a
    // rejected file used to leave the previous one loaded and importable,
    // under the new file's name in the user's mind.
    setParsed(null);
    setPreview(null);
    setPreviewOverrides({});
    setCommitted(null);
    setOverrides({});

    const reader = new FileReader();
    reader.onerror = () => toast.error("That file could not be read. Try selecting it again.");
    reader.onload = () => {
      let headers: string[];
      let rows: string[][];
      try {
        ({ headers, rows } = parseCsv(String(reader.result ?? "")));
      } catch (error) {
        // A file that cannot be parsed unambiguously is refused outright.
        // Importing an approximation of someone's data is worse than not
        // importing it, because nothing downstream would reveal the difference.
        toast.error(error instanceof CsvParseError ? error.message : getErrorMessage(error));
        return;
      }

      if (headers.length === 0) {
        toast.error("That file has no header row.");
        return;
      }
      if (rows.length > MAX_ROWS) {
        toast.error(`That file has ${rows.length} rows; ${MAX_ROWS} is the most this handles.`);
        return;
      }

      setParsed({ filename: file.name, headers, rows });
    };
    reader.readAsText(file);
  }

  function runPreview() {
    if (!parsed) return;
    // Captured rather than read at settle time: the answers this plan is built
    // from are the ones sent with it, not whatever state holds when it returns.
    const sent = overrides;
    previewImport.mutate(
      { ...parsed, overrides: Object.keys(sent).length > 0 ? sent : undefined },
      {
        onSuccess: (result) => {
          setPreview(result);
          setPreviewOverrides(sent);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function runCommit() {
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
  }

  function runRevert() {
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
  }

  return (
    <div className="flex flex-col gap-gap-section">
      {/* Export first, deliberately. It is ungated and needs no setup, and a
          prospect evaluating the product should see that leaving is easy before
          they are asked to bring anything in. */}
      <Card>
        <CardHeader>
          <CardTitle>Take your data out</CardTitle>
          <CardDescription>
            Everything you have put in, in an open format, at any time. No plan gating, and
            custom fields and history are included.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-gap-field">
          {EXPORT_ENTITIES.map((entity) => (
            <Button
              key={entity}
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                void downloadExport(entity, "csv").catch((error) => toast.error(getErrorMessage(error)))
              }
            >
              <Download className="mr-1.5 size-4" />
              {entity} (CSV)
            </Button>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              void downloadExport("archive", "json").catch((error) => toast.error(getErrorMessage(error)))
            }
          >
            <Download className="mr-1.5 size-4" />
            Everything (JSON)
          </Button>
        </CardContent>
      </Card>

      {canImport ? (
        <Card>
          <CardHeader>
            <CardTitle>Bring your data in</CardTitle>
            <CardDescription>
              Export your accounts or companies from your current CRM as a CSV and drop it here.
              Nothing is created until you say so, and you can undo the whole thing afterwards.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-gap-toolbar">
            <div>
              <Label htmlFor="import-file">Your CSV</Label>
              <input
                id="import-file"
                type="file"
                accept=".csv,text/csv"
                className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-card file:px-3 file:py-1.5 file:text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) readFile(file);
                }}
              />
            </div>

            {parsed ? (
              <p className="text-label text-muted-foreground">
                {parsed.filename} — {parsed.rows.length} {parsed.rows.length === 1 ? "row" : "rows"},{" "}
                {parsed.headers.length} columns
              </p>
            ) : null}

            {parsed && !committed ? (
              <LoadingButton
                type="button"
                className="self-start"
                isPending={previewImport.isPending}
                onClick={runPreview}
              >
                <Upload className="mr-1.5 size-4" />
                {preview ? "Check again" : "See what would happen"}
              </LoadingButton>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {preview && !committed ? (
        <>
          <ColumnMappingReview
            columns={preview.columns}
            overrides={overrides}
            onOverride={(header, field) => setOverrides((current) => ({ ...current, [header]: field }))}
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
                  {progress.done} done, {progress.remaining} to go. This runs on the
                  server and carries on if you leave — reopen the import to see where
                  it got to.
                </p>
              ) : null}

              <LoadingButton
                type="button"
                className="self-start"
                isPending={commitImport.isPending}
                disabled={unanswered.length > 0 || choicesChanged || preview.summary.total === 0}
                onClick={runCommit}
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
              onClick={runRevert}
            >
              <Undo2 className="mr-1.5 size-4" />
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
