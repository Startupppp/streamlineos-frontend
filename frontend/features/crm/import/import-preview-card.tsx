"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ImportPreview, MappedColumn } from "@/types/crm/import";
import { ColumnMappingReview } from "./column-mapping-review";

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

interface ImportPreviewCardProps {
  preview: ImportPreview;
  overrides: Record<string, string>;
  choicesChanged: boolean;
  unanswered: MappedColumn[];
  progress: { done: number; remaining: number } | null;
  commitIsPending: boolean;
  onOverride(header: string, field: string): void;
  onCommit(): void;
}

export function ImportPreviewCard({
  preview,
  overrides,
  choicesChanged,
  unanswered,
  progress,
  commitIsPending,
  onOverride,
  onCommit,
}: ImportPreviewCardProps) {
  return (
    <>
      <ColumnMappingReview
        columns={preview.columns}
        overrides={overrides}
        onOverride={onOverride}
      />

      <Card>
        <CardHeader>
          <CardTitle>What this would do</CardTitle>
          <CardDescription>
            Exactly this, and nothing else. Committing runs the plan below.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-gap-toolbar">
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
            isPending={commitIsPending}
            disabled={unanswered.length > 0 || choicesChanged || preview.summary.total === 0}
            onClick={onCommit}
          >
            Import {preview.summary.create + preview.summary.update} records
          </LoadingButton>
        </CardContent>
      </Card>
    </>
  );
}
