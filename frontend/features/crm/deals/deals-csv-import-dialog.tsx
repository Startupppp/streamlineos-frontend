"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Upload,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { CsvFieldMapper } from "@/features/crm/leads/csv-field-mapper";

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

interface ParsedDeal {
  name: string;
  value?: number;
  stage?: string;
  ownerEmail?: string;
  expectedCloseDate?: string;
  contactEmail?: string;
  companyName?: string;
  description?: string;
}

const DEAL_FIELDS: { value: string; label: string }[] = [
  { value: "_skip", label: "— Skip —" },
  { value: "name", label: "Deal Name (required)" },
  { value: "value", label: "Value / Amount" },
  { value: "stage", label: "Stage (NEW/QUALIFIED/PROPOSAL/…)" },
  { value: "owner_email", label: "Owner Email" },
  { value: "expected_close_date", label: "Expected Close Date" },
  { value: "contact_email", label: "Contact Email" },
  { value: "company_name", label: "Company Name" },
  { value: "description", label: "Description" },
];

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "deal name", "dealname", "title", "deal title", "dealtitle"],
  value: ["value", "amount", "deal value", "dealvalue", "budget", "price"],
  stage: ["stage", "deal stage", "dealstage", "status", "pipeline stage"],
  owner_email: [
    "owner email",
    "owneremail",
    "owner",
    "assigned to",
    "assignedto",
    "sales rep email",
    "rep email",
  ],
  expected_close_date: [
    "expected close date",
    "expectedclosedate",
    "close date",
    "closedate",
    "closing date",
    "closingdate",
    "due date",
    "duedate",
  ],
  contact_email: [
    "contact email",
    "contactemail",
    "customer email",
    "customeremail",
    "client email",
    "clientemail",
  ],
  company_name: [
    "company name",
    "companyname",
    "company",
    "organization",
    "account",
    "account name",
    "accountname",
  ],
  description: ["description", "notes", "details", "summary", "remarks"],
};

function matchHeader(header: string): string | null {
  const h = header.toLowerCase().trim().replace(/[_-]/g, "");
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const normalizedAliases = aliases.map((a) => a.replace(/[_-]/g, ""));
    if (normalizedAliases.includes(h)) return field;
  }
  return null;
}

function getFileExtension(name: string): string {
  return name.slice(name.lastIndexOf(".")).toLowerCase();
}

function extractCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/['"]/g, ""));
  const rows = lines
    .slice(1)
    .map((l) => l.split(",").map((c) => c.trim().replace(/^["']|["']$/g, "")));
  return { headers, rows };
}

async function extractExcel(
  buffer: ArrayBuffer,
): Promise<{ headers: string[]; rows: string[][] }> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) return { headers: [], rows: [] };

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });

  const rows: string[][] = [];
  for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
    const row = sheet.getRow(rowIdx);
    const cols: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cols[colNumber - 1] = String(cell.value ?? "").trim();
    });
    if (!cols.every((c) => !c)) rows.push(cols);
  }
  return { headers, rows };
}

function applyMapping(
  headers: string[],
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
        "/crm/deals/bulk-import",
        { deals },
      ),
  });
}

interface DealsPreviewProps {
  fileName: string;
  parsed: ParsedDeal[];
  parseErrors: string[];
  importResult: { created: number; failed: number } | null;
  isImporting: boolean;
  onEditMapping: () => void;
  onImport: () => void;
  onClose: () => void;
}

function DealsPreview({
  fileName,
  parsed,
  parseErrors,
  importResult,
  isImporting,
  onEditMapping,
  onImport,
  onClose,
}: DealsPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">{fileName}</span>
          <Badge variant="secondary">{parsed.length} deals</Badge>
        </div>
        {!importResult && (
          <Button variant="ghost" size="sm" onClick={onEditMapping}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Edit Mapping
          </Button>
        )}
      </div>

      {parseErrors.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              {parseErrors.length} warnings
            </span>
          </div>
          {parseErrors.slice(0, 5).map((err, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              {err}
            </p>
          ))}
          {parseErrors.length > 5 && (
            <p className="text-xs text-muted-foreground mt-1">
              ...and {parseErrors.length - 5} more
            </p>
          )}
        </div>
      )}

      {parsed.length > 0 && (
        <div className="border rounded-lg overflow-hidden max-h-[260px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Value</TableHead>
                <TableHead className="text-xs">Stage</TableHead>
                <TableHead className="text-xs">Owner Email</TableHead>
                <TableHead className="text-xs">Close Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsed.slice(0, 20).map((deal, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">
                    {deal.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {deal.value !== undefined
                      ? `₹${deal.value.toLocaleString()}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {deal.stage ? (
                      <Badge variant="outline" className="text-[10px]">
                        {deal.stage}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {deal.ownerEmail || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {deal.expectedCloseDate || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {parsed.length > 20 && (
            <p className="text-xs text-center text-muted-foreground py-2">
              ...and {parsed.length - 20} more
            </p>
          )}
        </div>
      )}

      {importResult ? (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 space-y-1">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Import Complete
            </p>
            <p className="text-xs text-muted-foreground">
              {importResult.created} deals created
              {importResult.failed > 0 ? `, ${importResult.failed} failed` : ""}
            </p>
          </div>
          <Button className="w-full" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <Button
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          onClick={onImport}
          disabled={isImporting || !parsed.length}
        >
          {isImporting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Importing...
            </span>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Import {parsed.length} Deals
            </>
          )}
        </Button>
      )}
    </div>
  );
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
    const { deals, errors } = applyMapping(rawHeaders, rawRows, fieldMappings);
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
      onError: (err) => toast.error(err.message),
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
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
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
                    ? "bg-blue-500 text-white"
                    : i < ["upload", "mapping", "preview"].indexOf(step)
                      ? "bg-blue-500/30 text-blue-600"
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
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-blue-500/50 transition-colors"
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
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">
              Parsing {fileName}...
            </p>
          </div>
        )}

        {step === "mapping" && (
          <CsvFieldMapper
            fields={DEAL_FIELDS}
            requiredFieldLabel="Deal Name"
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
          <DealsPreview
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
