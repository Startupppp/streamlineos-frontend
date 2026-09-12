"use client";

import { AppDialog } from "@/components/shared";
import type { ReportRunLogEntry } from "@/types/crm/reporting";

interface ReportRunSqlDialogProps {
  run: ReportRunLogEntry | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * The statement a run executed.
 *
 * This is readable by somebody holding only `crm:reporting:view` because the
 * stored SQL carries placeholders and no literals — that property is what makes
 * the audit read grantable apart from a view of the data, so it is stated on
 * screen rather than assumed.
 */
export function ReportRunSqlDialog({ run, onOpenChange }: ReportRunSqlDialogProps) {
  return (
    <AppDialog
      open={run !== null}
      onOpenChange={onOpenChange}
      title="The statement that ran"
      description="Stored with placeholders and no values, which is why it can be read without permission to read the data."
      className="sm:max-w-2xl"
    >
      {run ? (
        <div className="flex flex-col gap-gap-field">
          <dl className="grid grid-cols-2 gap-gap-field sm:grid-cols-4">
            <div>
              <dt className="text-micro text-muted-foreground">Read</dt>
              <dd className="text-sm font-medium">{run.sourceKey}</dd>
            </div>
            <div>
              <dt className="text-micro text-muted-foreground">Values bound</dt>
              <dd className="text-sm font-medium tabular-nums">{run.parameterCount}</dd>
            </div>
            <div>
              <dt className="text-micro text-muted-foreground">Rows returned</dt>
              <dd className="text-sm font-medium tabular-nums">{run.rowCount ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-micro text-muted-foreground">Took</dt>
              <dd className="text-sm font-medium tabular-nums">
                {run.durationMs === null ? "—" : `${run.durationMs}ms`}
              </dd>
            </div>
          </dl>

          <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-dense whitespace-pre-wrap break-words">
            {run.compiledSql}
          </pre>
        </div>
      ) : null}
    </AppDialog>
  );
}
