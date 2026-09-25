"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  Users,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useBulkOnboardEmployees } from "@/hooks/api/hr";
import { useOrgDepartments } from "@/hooks/api/org-hierarchy";
import type { BulkOnboardEmployeeRow, BulkOnboardResult } from "@/types/hr";

import { BULK_ONBOARD_COLUMNS, MAX_ROWS } from "./bulk-onboard-columns";
import { parseFile } from "./bulk-onboard-parse";
import { validateAndMap, type PreviewRow } from "./bulk-onboard-template";
import { downloadBulkOnboardTemplate } from "./bulk-onboard-download";
import { BulkOnboardPreviewTable } from "./bulk-onboard-preview-table";
import { BulkOnboardResultPanel } from "./bulk-onboard-result-panel";

type Step = "upload" | "preview" | "done";

export { BULK_ONBOARD_COLUMNS };

export function BulkOnboardPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: orgDepartments } = useOrgDepartments({ limit: 100, status: "ACTIVE" });
  const bulkOnboard = useBulkOnboardEmployees();

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [payloads, setPayloads] = useState<BulkOnboardEmployeeRow[]>([]);
  const [result, setResult] = useState<BulkOnboardResult | null>(null);
  const [parsing, setParsing] = useState(false);

  const deptNames = useMemo(() => {
    const names = new Set<string>();
    for (const d of orgDepartments?.data ?? []) {
      if (d.name?.trim()) names.add(d.name.trim().toLowerCase());
      if (d.code?.trim()) names.add(d.code.trim().toLowerCase());
    }
    return names;
  }, [orgDepartments?.data]);

  const deptNameList = useMemo(() => {
    const labels = new Set<string>();
    for (const d of orgDepartments?.data ?? []) {
      if (d.name?.trim()) labels.add(d.name.trim());
    }
    return [...labels].sort((a, b) => a.localeCompare(b));
  }, [orgDepartments?.data]);

  const validCount = useMemo(() => previewRows.filter((r) => r.valid).length, [previewRows]);
  const invalidCount = previewRows.length - validCount;

  const handleDownloadTemplate = useCallback(async () => {
    try {
      await downloadBulkOnboardTemplate(deptNameList);
      toast.success("Template downloaded");
    } catch {
      toast.error("Could not download template");
    }
  }, [deptNameList]);

  const reset = useCallback(() => {
    setStep("upload");
    setFileName("");
    setPreviewRows([]);
    setPayloads([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setParsing(true);
      try {
        const parsed = await parseFile(file);
        if (parsed.length === 0) {
          toast.error("No data rows found. Keep the header row and add employees below it.");
          return;
        }
        if (parsed.length > MAX_ROWS) {
          toast.error(`Too many rows (${parsed.length}). Maximum is ${MAX_ROWS} per upload.`);
          return;
        }

        const nextPreview: PreviewRow[] = [];
        const nextPayloads: BulkOnboardEmployeeRow[] = [];
        const seenEmails = new Set<string>();

        parsed.forEach((row, i) => {
          const { payload, preview } = validateAndMap(row, deptNames);
          if (preview.email && seenEmails.has(preview.email)) {
            preview.errors = [...preview.errors, "Duplicate email in this file"];
            preview.valid = false;
          } else if (preview.email) {
            seenEmails.add(preview.email);
          }
          nextPreview.push({ ...preview, _idx: i + 1 });
          if (payload && preview.valid) nextPayloads.push(payload);
        });

        setFileName(file.name);
        setPreviewRows(nextPreview);
        setPayloads(nextPayloads);
        setStep("preview");
      } catch {
        toast.error("Failed to parse file. Use the template (.xlsx) or a CSV with the same headers.");
      } finally {
        setParsing(false);
      }
    },
    [deptNames],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const handleImport = useCallback(() => {
    if (payloads.length === 0) {
      toast.error("No valid rows to import. Fix errors in the file and re-upload.");
      return;
    }

    bulkOnboard.mutate(payloads, {
      onSuccess: (res) => {
        setResult(res);
        setStep("done");
        if (res.created > 0 && res.failed === 0) {
          toast.success(`Onboarded ${res.created} employee${res.created === 1 ? "" : "s"}`);
        } else if (res.created > 0) {
          toast.warning(`Onboarded ${res.created}, ${res.failed} failed`);
        } else {
          toast.error("No employees were created. Check the errors below.");
        }
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [payloads, bulkOnboard]);

  const handleDropZoneKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
    },
    [],
  );

  const handleDropZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Bulk onboard employees
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download the template, fill one row per employee, then upload to create up to {MAX_ROWS} accounts at once.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 shrink-0"
          onClick={() => void handleDownloadTemplate()}
        >
          <Download className="h-3.5 w-3.5" />
          Download template
        </Button>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <p className="text-dense font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Required columns
          </p>
          <div className="flex flex-wrap gap-1.5">
            {BULK_ONBOARD_COLUMNS.filter((c) => c.required).map((c) => (
              <Badge key={c.key} variant="outline" className="text-micro h-5 font-mono font-normal">
                {c.header}
              </Badge>
            ))}
          </div>
          <p className="text-dense text-muted-foreground mt-2">
            Optional: phone, gender, role, employeeId, joiningDate, dateOfBirth, taxId, monthlySalary, bank fields.
            {deptNameList.length > 0 && (
              <>
                {" "}
                Departments:{" "}
                <span className="text-foreground/80">{deptNameList.join(", ")}</span>
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {step === "upload" && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Upload file</CardTitle>
            <CardDescription className="text-xs">
              CSV or Excel (.xlsx). Use the template headers for best results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={handleDropZoneKeyDown}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={handleDropZoneClick}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-colors",
                "hover:border-primary/50 hover:bg-primary/[0.02]",
                parsing && "pointer-events-none opacity-70",
              )}
            >
              {parsing ? (
                <Loader2 className="h-9 w-9 mx-auto mb-3 text-primary animate-spin" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
              )}
              <p className="text-sm font-medium">
                {parsing ? "Parsing file…" : "Drag & drop or click to upload"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                .csv, .xlsx — max {MAX_ROWS} employees
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileInput}
              aria-label="Upload employee onboard file"
            />
            <div className="mt-3 flex items-start gap-2 text-dense text-muted-foreground">
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Prefer downloading the template first so columns match. The sample row can be edited or deleted.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Preview · {fileName}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {previewRows.length} row{previewRows.length === 1 ? "" : "s"} ·{" "}
                  <span className="text-status-success-ink">{validCount} ready</span>
                  {invalidCount > 0 && (
                    <>
                      {" · "}
                      <span className="text-destructive">{invalidCount} with errors</span>
                    </>
                  )}
                </CardDescription>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1" onClick={reset}>
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {invalidCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2 text-xs text-status-warning-ink">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Rows with errors will be skipped. Fix them in your file and re-upload, or continue to import only the ready rows.
                </span>
              </div>
            )}

            <BulkOnboardPreviewTable rows={previewRows} />

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={reset}>
                Back
              </Button>
              <LoadingButton
                type="button"
                size="sm"
                className="h-8 gap-1.5 min-w-[140px]"
                disabled={payloads.length === 0}
                isPending={bulkOnboard.isPending}
                loadingText="Onboarding…"
                onClick={handleImport}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Onboard {payloads.length} employee{payloads.length === 1 ? "" : "s"}
              </LoadingButton>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && result && (
        <BulkOnboardResultPanel result={result} onReset={reset} />
      )}
    </div>
  );
}
