"use client";

import { useId, useState, type ChangeEvent } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/get-error-message";
import type { BulkReassignmentRowInput } from "@/hooks/api/hr/reporting-line-bulk-jobs-schema";
import { downloadMappingTemplate, parseMappingFile, type ParsedMapping } from "./mapping-file";

const MAX_LISTED_ERRORS = 10;

interface MappingUploadProps {
  rows: BulkReassignmentRowInput[];
  onRowsChange: (rows: BulkReassignmentRowInput[]) => void;
}

/** Source 2 of the wizard: a mapping file parsed in the browser; the server validates on preview. */
export function MappingUpload({ rows, onRowsChange }: MappingUploadProps) {
  const inputId = useId();
  const [parsed, setParsed] = useState<ParsedMapping | null>(null);
  const [fileName, setFileName] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const result = await parseMappingFile(file);
      setParsed(result);
      onRowsChange(result.errors.length > 0 ? [] : result.rows);
    } catch (error) {
      setParsed(null);
      onRowsChange([]);
      toast.error(getErrorMessage(error));
    }
  }

  function handleDownloadTemplate() {
    void downloadMappingTemplate();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        One row per employee: <span className="font-mono">employeeEmail</span>, the new{" "}
        <span className="font-mono">primaryManagerEmail</span>, optional secondary managers, an effective date and a reason.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={inputId}>Mapping file (.xlsx or .csv)</Label>
          <Input id={inputId} type="file" accept=".xlsx,.csv,text/csv" onChange={handleFileChange} className="sm:max-w-xs" />
        </div>
        <Button type="button" variant="outline" onClick={handleDownloadTemplate}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Download template
        </Button>
      </div>
      {parsed && parsed.errors.length > 0 ? (
        <ul role="alert" className="flex flex-col gap-1 text-sm text-destructive">
          {parsed.errors.slice(0, MAX_LISTED_ERRORS).map((error) => (
            <li key={error}>{error}</li>
          ))}
          {parsed.errors.length > MAX_LISTED_ERRORS ? (
            <li>…and {parsed.errors.length - MAX_LISTED_ERRORS} more. Fix these and upload again.</li>
          ) : null}
        </ul>
      ) : null}
      {parsed && parsed.errors.length === 0 ? (
        <p className="text-sm" aria-live="polite">
          {fileName}: <span className="tabular-nums">{rows.length}</span> {rows.length === 1 ? "employee" : "employees"} ready to preview.
        </p>
      ) : null}
    </div>
  );
}
