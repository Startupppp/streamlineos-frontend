"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { activationProps } from "@/lib/keyboard-activation";

const MAX_IMPORT_ROWS = 500;

const CANDIDATE_FIELDS = [
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: true },
  { key: "email", label: "Email", required: true },
  { key: "phone", label: "Phone", required: false },
  { key: "currentCompany", label: "Current Company", required: false },
  { key: "currentRole", label: "Current Role / Title", required: false },
  { key: "resumeUrl", label: "Resume URL", required: false },
  { key: "linkedinUrl", label: "LinkedIn URL", required: false },
  { key: "location", label: "Location", required: false },
  { key: "skills", label: "Skills (comma-separated)", required: false },
  { key: "experienceYears", label: "Experience Years", required: false },
  { key: "source", label: "Source", required: false },
];

interface ParsedRow {
  [key: string]: string;
}

type IndexedRow = { [key: string]: string | number } & { _idx: number };

type Step = "upload" | "map" | "preview" | "done";

interface FieldMappingRowProps {
  field: { key: string; label: string; required: boolean };
  value: string;
  headers: string[];
  onChange: (fieldKey: string, value: string) => void;
}

function FieldMappingRow({ field, value, headers, onChange }: FieldMappingRowProps) {
  function handleChange(v: string) {
    onChange(field.key, v === "__none__" ? "" : v);
  }
  return (
    <div className="grid grid-cols-2 gap-4 items-center">
      <div className="flex items-center gap-1.5 text-sm">
        <span>{field.label}</span>
        {field.required && <Badge variant="outline" className="text-micro h-4 px-1">required</Badge>}
      </div>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="text-xs">
          <SelectValue placeholder="— skip —" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__" className="text-xs">— skip —</SelectItem>
          {headers.map((h) => (
            <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function BulkImportPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsParsing(true);
    try {
      let parsedHeaders: string[] = [];
      let parsedRows: ParsedRow[] = [];

      if (file.name.endsWith(".csv") || file.type === "text/csv") {
        const Papa = (await import("papaparse")).default;
        const text = await file.text();
        const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
        parsedHeaders = result.meta.fields ?? [];
        parsedRows = result.data as ParsedRow[];
      } else {
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await file.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) { toast.error("No data found in file"); return; }
        const firstRow = worksheet.getRow(1);
        const colCount = firstRow.cellCount;
        parsedHeaders = Array.from({ length: colCount }, (_, i) => {
          const cell = firstRow.getCell(i + 1);
          return cell.text ?? "";
        });
        const dataRows: ParsedRow[] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const entry: ParsedRow = {};
          parsedHeaders.forEach((header, idx) => {
            entry[header] = row.getCell(idx + 1).text ?? "";
          });
          dataRows.push(entry);
        });
        if (dataRows.length === 0) { toast.error("No data found in file"); return; }
        parsedRows = dataRows;
      }

      if (parsedHeaders.length === 0) { toast.error("No columns detected"); return; }
      if (parsedRows.length === 0) { toast.error("No rows found in file"); return; }

      const autoMap: Record<string, string> = {};
      const fieldKeywords: Record<string, string[]> = {
        firstName: ["first name", "firstname", "first_name", "given name"],
        lastName: ["last name", "lastname", "last_name", "surname", "family name"],
        email: ["email", "e-mail", "mail"],
        phone: ["phone", "mobile", "contact", "cell"],
        currentCompany: ["company", "employer", "organization", "organisation"],
        currentRole: ["role", "title", "position", "designation", "job title"],
        resumeUrl: ["resume", "cv", "resume url", "cv url"],
        linkedinUrl: ["linkedin", "linkedin url"],
        location: ["location", "city", "address", "place"],
        skills: ["skills", "technologies", "tech stack"],
        experienceYears: ["experience", "years", "exp"],
        source: ["source", "referral", "origin"],
      };

      for (const header of parsedHeaders) {
        const lower = header.toLowerCase();
        for (const [field, keywords] of Object.entries(fieldKeywords)) {
          if (keywords.some((kw) => lower.includes(kw))) {
            if (!autoMap[field]) autoMap[field] = header;
          }
        }
      }

      if (parsedRows.length > MAX_IMPORT_ROWS)
        toast.warning(
          `That file has ${parsedRows.length} rows and ${MAX_IMPORT_ROWS} is the most one import takes. The first ${MAX_IMPORT_ROWS} are loaded; split the file to bring in the rest.`,
        );

      setHeaders(parsedHeaders);
      setRows(parsedRows.slice(0, MAX_IMPORT_ROWS));
      setFieldMap(autoMap);
      setStep("map");
    } catch {
      toast.error("Failed to parse file. Please check the format.");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) void handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleImport = useCallback(async () => {
    const mappedRows = rows
      .map((row) => {
        const mapped: Record<string, string | number | null> = {};
        for (const [field, header] of Object.entries(fieldMap)) {
          if (header) {
            const val = row[header]?.trim();
            mapped[field] = val || null;
          }
        }
        if (mapped.experienceYears) {
          const num = parseFloat(String(mapped.experienceYears));
          mapped.experienceYears = Number.isFinite(num) ? num : null;
        }
        return mapped;
      })
      .filter((r) => r.email && r.firstName && r.lastName);

    if (mappedRows.length === 0) {
      toast.error("No valid rows to import. Email, First Name, and Last Name are required.");
      return;
    }

    setImporting(true);
    try {
      const data = await apiClient.post<{ created: number; skipped: number; errors: string[] }>(
        "/hr/recruitment/candidates/bulk-import",
        { rows: mappedRows },
      );
      setImportResult(data);
      setStep("done");
      void qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  }, [rows, fieldMap, qc]);

  const requiredMapped = CANDIDATE_FIELDS.filter((f) => f.required).every((f) => fieldMap[f.key]);
  const previewRows = rows.slice(0, 10);

  const previewColumns = useMemo<DataTableColumn<IndexedRow>[]>(
    () =>
      CANDIDATE_FIELDS.filter((f) => fieldMap[f.key]).map((f) => ({
        key: f.key,
        header: f.label,
        cell: (row) => {
          const header = fieldMap[f.key] ?? "";
          return (
            <span className="max-w-[160px] truncate block">
              {row[header] ?? "—"}
            </span>
          );
        },
        className: "text-xs",
        headerClassName: "text-left",
      })),
    [fieldMap],
  );

  const indexedPreviewRows = useMemo<IndexedRow[]>(
    () => previewRows.map((row, i) => ({ ...row, _idx: i })),
    [previewRows],
  );

  const handleFieldMapChange = useCallback((fieldKey: string, value: string) => {
    setFieldMap((prev) => ({ ...prev, [fieldKey]: value }));
  }, []);

  function handleGoToUpload() { setStep("upload"); }
  function handleGoToPreview() { setStep("preview"); }
  function handleGoToMap() { setStep("map"); }
  function handleViewCandidates() { router.push("/hr/recruitment/candidates"); }
  function handleImportMore() {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setFieldMap({});
    setImportResult(null);
  }
  function handleClickDropzone() { fileInputRef.current?.click(); }

  const STEPS: Step[] = ["upload", "map", "preview", "done"];

  return (
    <PageWrapper
      title="Bulk Import Candidates"
      subtitle="Upload a CSV or Excel file to import candidates"
      backHref="/hr/recruitment/candidates"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <div className="flex gap-2 text-xs">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step === s ? "bg-primary text-primary-foreground" : STEPS.indexOf(s) <= STEPS.indexOf(step) ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {i + 1}
              </div>
              <span className={step === s ? "font-medium" : "text-muted-foreground capitalize"}>{s}</span>
              {i < 3 && (
                <svg className="h-3 w-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload File</CardTitle>
              <CardDescription>Supported formats: CSV, XLSX, XLS</CardDescription>
            </CardHeader>
            <CardContent>
              {isParsing ? (
                <div className="space-y-3" role="status" aria-label="Reading file">
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary/60 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  {...activationProps(handleClickDropzone, "Choose a file to upload")}
                >
                  <svg className="h-10 w-10 mx-auto mb-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p className="font-medium text-sm">Drag & drop or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV, XLSX, or XLS — up to 500 rows</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInputChange}
              />
            </CardContent>
          </Card>
        )}

        {step === "map" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Map Columns</CardTitle>
              <CardDescription>Match your file columns to candidate fields</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                {CANDIDATE_FIELDS.map((field) => (
                  <FieldMappingRow
                    key={field.key}
                    field={field}
                    value={fieldMap[field.key] ?? "__none__"}
                    headers={headers}
                    onChange={handleFieldMapChange}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleGoToUpload}>Back</Button>
                <Button onClick={handleGoToPreview} disabled={!requiredMapped}>
                  Preview ({rows.length} rows)
                </Button>
              </div>
              {!requiredMapped && (
                <p className="text-xs text-destructive mt-2">Map all required fields to continue.</p>
              )}
            </CardContent>
          </Card>
        )}

        {step === "preview" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview (first {previewRows.length} rows)</CardTitle>
              <CardDescription>{rows.length} total rows found</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <DataTable
                  data={indexedPreviewRows}
                  columns={previewColumns}
                  getRowKey={(row) => row._idx}
                  emptyState={
                    <EmptyState
                      className="border-0 bg-transparent"
                      illustrationPreset="upload"
                      title="Nothing to preview"
                      description="The uploaded file contained no data rows. Go back and upload a file with at least one row."
                      action={{ label: "Back to upload", onClick: handleGoToUpload }}
                      compact
                    />
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleGoToMap}>Back</Button>
                <LoadingButton onClick={handleImport} isPending={importing} loadingText="Importing…">
                  {`Import ${rows.length} Candidates`}
                </LoadingButton>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "done" && importResult && (
          <Card>
            <CardContent className="py-10 text-center">
              <div className="w-14 h-14 rounded-full bg-status-success-surface flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 text-status-success-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="font-semibold text-lg">Import Complete</p>
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-status-success-ink">{importResult.created}</p>
                  <p className="text-muted-foreground text-xs">Created</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-status-warning-ink">{importResult.skipped}</p>
                  <p className="text-muted-foreground text-xs">Skipped (duplicates)</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div
                  role="alert"
                  className="mx-auto mt-6 max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left"
                >
                  <p className="text-sm font-medium text-destructive">
                    {importResult.errors.length} row{importResult.errors.length === 1 ? "" : "s"} could not be imported
                  </p>
                  <ul className="mt-2 space-y-1">
                    {importResult.errors.map((rowError) => (
                      <li key={rowError} className="text-xs text-muted-foreground">
                        {rowError}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-3 justify-center mt-6">
                <Button onClick={handleViewCandidates}>View Candidates</Button>
                <Button variant="outline" onClick={handleImportMore}>Import More</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
