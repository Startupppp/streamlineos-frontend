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
import { parseCsv } from "@/lib/csv-parse";
import { getErrorMessage } from "@/lib/get-error-message";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { EXPORT_ENTITIES, type ImportPreview } from "@/types/crm/import";
import { ColumnMappingReview } from "./column-mapping-review";

/** A file this size is a paste, not a migration; the connectors are Phase 2. */
const MAX_ROWS = 5_000;

export function CrmImportPage() {
  const canImport = useCan("crm:imports:manage");

  const [parsed, setParsed] = useState<{ filename?: string; headers: string[]; rows: string[][] } | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [committed, setCommitted] = useState<{ crmImportId: string; created: number; updated: number } | null>(null);

  const previewImport = usePreviewImport();
  const commitImport = useCommitImport();
  const revertImport = useRevertImport();

  const unanswered = preview?.needsConfirmation.filter((column) => !overrides[column.header]) ?? [];

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const { headers, rows } = parseCsv(String(reader.result ?? ""));

      if (headers.length === 0) {
        toast.error("That file has no header row.");
        return;
      }
      if (rows.length > MAX_ROWS) {
        toast.error(`That file has ${rows.length} rows; ${MAX_ROWS} is the most this handles.`);
        return;
      }

      setParsed({ filename: file.name, headers, rows });
      setPreview(null);
      setCommitted(null);
      setOverrides({});
    };
    reader.readAsText(file);
  }

  function runPreview() {
    if (!parsed) return;
    previewImport.mutate(
      { ...parsed, overrides: Object.keys(overrides).length > 0 ? overrides : undefined },
      {
        onSuccess: (result) => setPreview(result),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function runCommit() {
    if (!preview) return;
    commitImport.mutate(preview.crmImportId, {
      onSuccess: (result) => {
        setCommitted({ crmImportId: preview.crmImportId, ...result });
        toast.success(`${result.created} created, ${result.updated} updated`);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function runRevert() {
    if (!committed) return;
    revertImport.mutate(committed.crmImportId, {
      onSuccess: (result) => {
        toast.success(`Undone — ${result.deleted} removed, ${result.restored} put back`);
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
              <div className="flex flex-wrap gap-gap-grid">
                <Summary label="Created" value={preview.summary.create} tone="success" />
                <Summary label="Updated" value={preview.summary.update} tone="info" />
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

              {unanswered.length > 0 ? (
                <p role="alert" className="text-label text-status-warning-ink">
                  Answer {unanswered.length} {unanswered.length === 1 ? "column" : "columns"} above first.
                </p>
              ) : null}

              <LoadingButton
                type="button"
                className="self-start"
                isPending={commitImport.isPending}
                disabled={unanswered.length > 0 || preview.summary.total === 0}
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
  tone: "success" | "info" | "neutral";
}) {
  return (
    <div>
      <p className="text-micro text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-medium tabular-nums", statusToneClasses(tone).ink)}>{value}</p>
    </div>
  );
}
