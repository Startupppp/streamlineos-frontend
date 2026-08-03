"use client";

import { useState, useCallback, useMemo } from "react";
import { Upload, FileText, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { DealsMappingStep, matchHeader, extractCSV, extractExcel } from "./deals-csv-mapping-step";
import type { ParsedDeal } from "./deals-csv-mapping-step";
import { DealsPreviewStep } from "./deals-csv-preview-step";

export type { ParsedDeal };

const VALID_STAGES = [
  "NEW",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;
type ValidStage = (typeof VALID_STAGES)[number];

function isValidStage(s: string): s is ValidStage {
  return (VALID_STAGES as readonly string[]).includes(s);
}

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

function getFileExtension(name: string): string {
  return name.slice(name.lastIndexOf(".")).toLowerCase();
}

function applyMapping(
  rows: string[][],
  fieldMappings: Record<number, string>,
): { deals: ParsedDeal[]; errors: string[] } {
  const fieldToCol: Record<string, number> = {};
  for (const [idxStr, field] of Object.entries(fieldMappings)) {
    if (field !== "_skip") fieldToCol[field] = Number(idxStr);
  }

  const deals: ParsedDeal[] = [];
  const errors: string[] = [];

  const get = (row: string[], field: string): string | undefined => {
    const idx = fieldToCol[field];
    return idx !== undefined ? row[idx]?.trim() || undefined : undefined;
  };

  rows.forEach((row, i) => {
    const name = get(row, "name");
    if (!name) {
      errors.push(`Row ${i + 2}: missing deal name, skipped.`);
      return;
    }

    const rawValue = get(row, "value");
    const parsedValue = rawValue
      ? Number(rawValue.replace(/[^0-9.-]/g, ""))
      : undefined;
    const value =
      parsedValue !== undefined && !Number.isNaN(parsedValue)
        ? parsedValue
        : undefined;

    const rawStage = get(row, "stage")?.toUpperCase();
    const stage: ValidStage =
      rawStage && isValidStage(rawStage) ? rawStage : "NEW";

    deals.push({
      name,
      value,
      stage,
      ownerEmail: get(row, "owner_email"),
      expectedCloseDate: get(row, "expected_close_date"),
      contactEmail: get(row, "contact_email"),
      companyName: get(row, "company_name"),
      description: get(row, "description"),
    });
  });

  return { deals, errors };
}

function useBulkImportDeals() {
  return useMutation({
    mutationKey: ["deals", "bulk-import"],
    mutationFn: (deals: ParsedDeal[]) =>
      apiClient.post<{ created: number; failed: number }>(
        "/deals/bulk-import",
        { deals },
      ),
  });
}

export function DealsCsvImportDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<number, string>>(
    {},
  );
  const [fileName, setFileName] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedDeal[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    created: number;
    failed: number;
  } | null>(null);

  const bulkImport = useBulkImportDeals();

  const handleFile = useCallback(async (file: File) => {
    const ext = getFileExtension(file.name);
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error("Unsupported file format. Use .csv, .xlsx, or .xls");
      return;
    }
    setFileName(file.name);
    setIsParsing(true);
    try {
      let headers: string[] = [];
      let rows: string[][] = [];
      if (ext === ".csv") {
        const text = await file.text();
        ({ headers, rows } = extractCSV(text));
      } else {
        const buffer = await file.arrayBuffer();
        ({ headers, rows } = await extractExcel(buffer));
      }
      if (headers.length === 0) {
        toast.error("Could not read file headers. Check the file format.");
        return;
      }
      const mappings: Record<number, string> = {};
      headers.forEach((h, i) => {
        const field = matchHeader(h);
        mappings[i] = field ?? "_skip";
      });
      setRawHeaders(headers);
      setRawRows(rows);
      setFieldMappings(mappings);
      setStep("mapping");
    } catch {
      toast.error("Failed to parse file. Please check the format.");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        const ext = getFileExtension(file.name);
        if (ACCEPTED_EXTENSIONS.includes(ext)) void handleFile(file);
        else toast.error("Please drop a .csv, .xlsx, or .xls file");
      }
    },
    [handleFile],
  );

  const hasNameMapped = useMemo(
    () => Object.values(fieldMappings).includes("name"),
    [fieldMappings],
  );

  const handleConfirmMapping = useCallback(() => {
    const { deals, errors } = applyMapping(rawRows, fieldMappings);
    setParsed(deals);
    setParseErrors(errors);
    setStep("preview");
  }, [rawHeaders, rawRows, fieldMappings]);

  const handleImport = useCallback(() => {
    if (!parsed?.length) return;
    bulkImport.mutate(parsed, {
      onSuccess: (data) => {
        setImportResult(data);
        if (data.created > 0) {
          toast.success(
            `${data.created} deals imported${data.failed ? `, ${data.failed} failed` : ""}`,
          );
          onSuccess?.();
        } else {
          toast.warning("No deals were imported");
        }
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [parsed, bulkImport, onSuccess]);

  const downloadTemplate = useCallback(() => {
    const csv =
      "name,value,stage,owner_email,expected_close_date,contact_email,company_name,description\n" +
      "Enterprise Deal,500000,QUALIFIED,owner@example.com,2025-12-31,client@corp.com,Acme Corp,Q4 renewal negotiation\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deals-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const reset = useCallback(() => {
    setStep("upload");
    setRawHeaders([]);
    setRawRows([]);
    setFieldMappings({});
    setParsed(null);
    setParseErrors([]);
    setFileName("");
    setIsParsing(false);
    setImportResult(null);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const handleBrowseClick = useCallback(() => {
    document.getElementById("deal-file-upload")?.click();
  }, []);

  const handleDialogClose = useCallback(
    (v: boolean) => {
      setOpen(v);
      if (!v) reset();
    },
    [reset],
  );

  const handleCloseAfterImport = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleEditMapping = useCallback(() => setStep("mapping"), []);

  const stepLabel =
    step === "upload"
      ? "Step 1 of 3 — Upload File"
      : step === "mapping"
        ? "Step 2 of 3 — Map Columns"
        : "Step 3 of 3 — Review & Import";

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader className="mb-1">
          <DialogTitle>Import Deals</DialogTitle>
          <p className="text-xs text-muted-foreground">{stepLabel}</p>
        </DialogHeader>

        <div className="flex items-center gap-1 mb-4">
          {["upload", "mapping", "preview"].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : i < ["upload", "mapping", "preview"].indexOf(step)
                      ? "bg-primary/30 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="h-px w-6 bg-border" />}
            </div>
          ))}
        </div>

        {step === "upload" && !isParsing && (
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">Drop your file here</p>
              <p className="text-xs text-muted-foreground mb-3">
                Supports .csv, .xlsx, and .xls
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                id="deal-file-upload"
                aria-label="Upload deals file"
                onChange={handleFileInputChange}
              />
              <Button variant="outline" size="sm" onClick={handleBrowseClick}>
                <FileText className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
            </div>
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">
                Required: <code className="text-foreground">name</code>.
                Optional: value, stage, owner_email, expected_close_date,
                contact_email, company_name, description
              </p>
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5 mr-1" />
                Template
              </Button>
            </div>
          </div>
        )}

        {isParsing && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">
              Parsing {fileName}...
            </p>
          </div>
        )}

        {step === "mapping" && (
          <DealsMappingStep
            fileName={fileName}
            rawHeaders={rawHeaders}
            rawRows={rawRows}
            fieldMappings={fieldMappings}
            hasNameMapped={hasNameMapped}
            onMappingChange={setFieldMappings}
            onConfirm={handleConfirmMapping}
            onBack={reset}
          />
        )}

        {step === "preview" && parsed !== null && (
          <DealsPreviewStep
            fileName={fileName}
            parsed={parsed}
            parseErrors={parseErrors}
            importResult={importResult}
            isImporting={bulkImport.isPending}
            onEditMapping={handleEditMapping}
            onImport={handleImport}
            onClose={handleCloseAfterImport}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
