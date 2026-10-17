"use client";

import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PolicyMissingBanner } from "@/components/hr/reporting-lines/policy-missing-banner";
import type { HrImportEntity, HrImportJob } from "@/hooks/api/hr/import-export";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Upload", "Preview", "Validate"] as const;

export function ImportWizardStepIndicator({ step }: { step: number }) {
  return (
    <ol className="mt-1 flex items-center gap-2" aria-label="Import steps">
      {STEP_LABELS.map((label, index) => {
        const s = index + 1;
        return (
          <li key={label} className="flex items-center gap-1.5" aria-current={step === s ? "step" : undefined}>
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-micro font-semibold",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : step > s
                    ? "bg-status-success-fill text-white"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {s}
            </span>
            <span className={cn("text-xs", step === s ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
            {s < STEP_LABELS.length ? <span className="h-px w-4 bg-border" aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

interface UploadStepProps {
  entity: HrImportEntity;
  columns: string[];
  parseError: string | null;
  onChooseFile: () => void;
}

export function ImportUploadStep({ entity, columns, parseError, onChooseFile }: UploadStepProps) {
  return (
    <div className="flex flex-col gap-4">
      {entity === "employees" ? <PolicyMissingBanner context="file" /> : null}
      <p className="text-sm text-muted-foreground">Upload a CSV file with the following columns:</p>
      <div className="flex flex-wrap gap-1.5">
        {columns.map((col) => (
          <Badge key={col} variant="secondary" className="font-mono text-xs">
            {col}
          </Badge>
        ))}
      </div>
      {entity === "employees" ? (
        <p className="text-xs text-muted-foreground">
          primaryManagerEmail sets the accountable manager; the old managerEmail, reportingManagerEmail and reportsTo
          headers are still read. For an employee who already exists, a blank manager column changes nothing — to remove
          a manager, set clearPrimaryManager to true together with topLevelRoleReason. A new employee with no manager is
          assigned one by your fallback policy.
        </p>
      ) : null}
      {entity === "document_metadata" ? (
        <p className="text-xs text-muted-foreground">
          The employee email on each row must be the work email of an employee who already exists and has an account. A row that matches nobody fails when you commit, with the reason, and nothing is stored for it.
        </p>
      ) : null}
      <button
        type="button"
        onClick={onChooseFile}
        className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-sm text-muted-foreground outline-none transition-colors hover:border-primary/50 hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Upload className="h-6 w-6" aria-hidden="true" />
        <span className="font-medium">Click to choose a CSV file</span>
        <span className="text-xs">.csv files only</span>
      </button>
      {parseError ? (
        <p className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {parseError}
        </p>
      ) : null}
    </div>
  );
}

type SampleRow = Record<string, string | number> & { _rowIdx: number };

function sampleRowKey(row: SampleRow) {
  return row._rowIdx;
}

export function ImportPreviewStep({ fileName, rows }: { fileName: string; rows: Record<string, string>[] }) {
  const headers = rows.length > 0 ? Object.keys(rows[0] ?? {}) : [];
  const sample: SampleRow[] = rows.slice(0, 5).map((row, i) => ({ ...row, _rowIdx: i }));
  const columns: DataTableColumn<SampleRow>[] = headers.map((header) => ({
    key: header,
    header,
    cell: function SampleCell(row: SampleRow) {
      return String(row[header] ?? "");
    },
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{fileName}</span>
        <Badge variant="secondary">{rows.length} rows</Badge>
      </div>
      <p className="text-xs text-muted-foreground">Showing first 5 rows. Verify the data looks correct before validating.</p>
      <DataTable data={sample} columns={columns} getRowKey={sampleRowKey} className="max-h-64 overflow-auto" />
    </div>
  );
}

export function ImportValidateStep({ job }: { job: HrImportJob }) {
  const errors = job.errors ?? [];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-status-success-rule bg-status-success-surface p-3">
          <div className="mb-0.5 flex items-center gap-1.5 text-status-success-ink">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-medium">Valid rows</span>
          </div>
          <p className="text-2xl font-semibold tabular-nums text-status-success-ink">{job.validRows}</p>
        </div>
        <div className="rounded-lg border border-status-danger-rule bg-status-danger-surface p-3">
          <div className="mb-0.5 flex items-center gap-1.5 text-status-danger-ink">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-medium">Error rows</span>
          </div>
          <p className="text-2xl font-semibold tabular-nums text-status-danger-ink">{job.errorRows}</p>
        </div>
      </div>

      {errors.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Errors (first {Math.min(errors.length, 5)} of {errors.length})
          </p>
          {errors.slice(0, 5).map((err) => (
            <div
              key={`${err.row}-${err.field ?? ""}-${err.message}`}
              className="rounded-md border border-status-danger-rule bg-status-danger-surface px-3 py-2 text-xs text-status-danger-ink"
            >
              <span className="font-medium">Row {err.row}</span>
              {err.field ? <span> · {err.field}</span> : null}
              {" — "}
              {err.message}
            </div>
          ))}
        </div>
      ) : null}

      {job.validRows === 0 ? <p className="text-sm text-destructive">No valid rows to commit. Fix the errors and try again.</p> : null}
    </div>
  );
}
