"use client";

import { useState, useCallback, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  useCreateImportJob,
  useCommitImportJob,
  type HrImportEntity,
  type HrImportJob,
} from "@/hooks/api/hr/import-export";

interface ImportWizardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: HrImportEntity;
  entityLabel: string;
  columns: string[];
}

type Step = 1 | 2 | 3;

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCsv(raw: string): Record<string, string>[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx]?.trim() ?? "";
    });
    rows.push(row);
  }
  return rows;
}

export function ImportWizardSheet({
  open,
  onOpenChange,
  entity,
  entityLabel,
  columns,
}: ImportWizardSheetProps) {
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [job, setJob] = useState<HrImportJob | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createJob = useCreateImportJob();
  const commitJob = useCommitImportJob();

  const handleReset = useCallback(() => {
    setStep(1);
    setFileName("");
    setParsedRows([]);
    setParseError(null);
    setJob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) handleReset();
      onOpenChange(next);
    },
    [onOpenChange, handleReset],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result;
        if (typeof text !== "string") return;
        const rows = parseCsv(text);
        if (rows.length === 0) {
          setParseError("No rows found. Check the CSV has a header row.");
          setParsedRows([]);
        } else {
          setParseError(null);
          setParsedRows(rows);
          setStep(2);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [],
  );

  const handleValidate = useCallback(() => {
    createJob.mutate(
      {
        entity,
        fileName,
        rows: parsedRows as Record<string, unknown>[],
      },
      {
        onSuccess: (result) => {
          setJob(result);
          setStep(3);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [createJob, entity, fileName, parsedRows]);

  const handleCommit = useCallback(() => {
    if (!job) return;
    commitJob.mutate(
      { jobId: job.id },
      {
        onSuccess: () => {
          toast.success(`${entityLabel} import committed successfully`);
          handleOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [commitJob, job, entityLabel, handleOpenChange]);

  const previewHeaders = parsedRows.length > 0 ? Object.keys(parsedRows[0]) : [];
  const previewRows = parsedRows.slice(0, 5).map((row, i) => ({ ...row, _rowIdx: i }));

  const previewColumns: DataTableColumn<Record<string, string> & { _rowIdx: number }>[] =
    previewHeaders.map((h) => ({
      key: h,
      header: h,
      cell: (row) => row[h] ?? "",
    }));

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle>Import {entityLabel}</SheetTitle>
          <div className="flex items-center gap-2 mt-1">
            {([1, 2, 3] as Step[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "h-5 w-5 rounded-full text-[10px] font-semibold flex items-center justify-center",
                    step === s
                      ? "bg-primary text-primary-foreground"
                      : step > s
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {s}
                </div>
                <span
                  className={cn(
                    "text-xs",
                    step === s ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  {s === 1 ? "Upload" : s === 2 ? "Preview" : "Validate"}
                </span>
                {s < 3 && <div className="h-px w-4 bg-border" />}
              </div>
            ))}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with the following columns:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {columns.map((col) => (
                  <Badge key={col} variant="secondary" className="font-mono text-xs">
                    {col}
                  </Badge>
                ))}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors p-8 flex flex-col items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Upload className="h-6 w-6" />
                <span className="font-medium">Click to choose a CSV file</span>
                <span className="text-xs">.csv files only</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
              {parseError && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {parseError}
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{fileName}</span>
                <Badge variant="secondary">{parsedRows.length} rows</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Showing first 5 rows. Verify the data looks correct before validating.
              </p>
              <DataTable
                data={previewRows}
                columns={previewColumns}
                getRowKey={(row) => row._rowIdx}
                className="max-h-64 overflow-auto"
              />
            </div>
          )}

          {step === 3 && job && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center gap-1.5 text-emerald-700 mb-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Valid rows</span>
                  </div>
                  <p className="text-2xl font-semibold text-emerald-800">{job.validRows}</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-center gap-1.5 text-red-700 mb-0.5">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Error rows</span>
                  </div>
                  <p className="text-2xl font-semibold text-red-800">{job.errorRows}</p>
                </div>
              </div>

              {job.errors && job.errors.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Errors (first {Math.min(job.errors.length, 5)} of {job.errors.length})
                  </p>
                  {job.errors.slice(0, 5).map((err, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border border-red-200 bg-red-50/50 px-3 py-2 text-xs text-red-700"
                    >
                      <span className="font-medium">Row {err.row}</span>
                      {err.field && <span className="text-red-500"> · {err.field}</span>}
                      {" — "}
                      {err.message}
                    </div>
                  ))}
                </div>
              )}

              {job.validRows === 0 && (
                <p className="text-sm text-destructive">
                  No valid rows to commit. Fix the errors and try again.
                </p>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="px-6 py-4 border-t border-border shrink-0 flex gap-2">
          {step === 1 && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <LoadingButton
                isPending={createJob.isPending}
                loadingText="Validating…"
                onClick={handleValidate}
              >
                Validate {parsedRows.length} rows
              </LoadingButton>
            </>
          )}
          {step === 3 && job && (
            <>
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <LoadingButton
                isPending={commitJob.isPending}
                loadingText="Committing…"
                disabled={job.validRows === 0}
                onClick={handleCommit}
              >
                Commit {job.validRows} rows
              </LoadingButton>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
