"use client";

import { useState, useCallback, useMemo } from "react";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBulkImportLeads } from "@/hooks/api/leads";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { CsvFieldMapper } from "./csv-field-mapper";
import { CsvUploadPreview } from "./csv-upload-preview";
import { CsvUploadStepUpload } from "./csv-upload-step-upload";

const VALID_SOURCES = [
  "referral",
  "campaign",
  "cold_call",
  "website",
  "social_media",
  "walk_in",
  "other",
] as const;
type ValidSource = (typeof VALID_SOURCES)[number];

const VALID_PRIORITIES = ["HOT", "WARM", "COLD"] as const;
type ValidPriority = (typeof VALID_PRIORITIES)[number];

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

function isValidSource(s: string): s is ValidSource {
  return (VALID_SOURCES as readonly string[]).includes(s);
}

function isValidPriority(s: string): s is ValidPriority {
  return (VALID_PRIORITIES as readonly string[]).includes(s);
}

interface ParsedLead {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: ValidSource;
  notes?: string;
  city?: string;
  designation?: string;
  referredBy?: string;
  potentialValue?: string;
  investmentInterest?: string;
  whatsappNumber?: string;
  website?: string;
  priority?: ValidPriority;
  tags?: string;
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "lead name", "full name", "contact name", "lead"],
  email: ["email", "e-mail", "email address", "mail"],
  phone: [
    "phone",
    "mobile",
    "tel",
    "telephone",
    "contact number",
    "phone number",
    "mobile number",
  ],
  company: ["company", "organization", "org", "firm", "company name"],
  source: ["source", "lead source", "channel"],
  notes: ["notes", "remarks", "comments", "description"],
  city: ["city", "location", "area"],
  designation: ["designation", "title", "role", "position", "job title"],
  referredBy: ["referred by", "referral", "referred", "referrer"],
  potentialValue: [
    "potential value",
    "value",
    "deal value",
    "amount",
    "budget",
  ],
  investmentInterest: ["investment interest", "investment", "interest"],
  whatsappNumber: ["whatsapp", "whatsapp number", "wa number"],
  website: ["website", "url", "web"],
  priority: ["priority", "lead priority", "urgency"],
  tags: ["tags", "labels", "categories"],
};

function matchHeader(header: string): string | null {
  const h = header.toLowerCase().trim().replace(/[_-]/g, "");
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(h)) return field;
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
  const headers = lines[0].split(",").map((h) => h.trim().replace(/['"]/g, ""));
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
): { leads: ParsedLead[]; errors: string[] } {
  const fieldToCol: Record<string, number> = {};
  for (const [idxStr, field] of Object.entries(fieldMappings)) {
    if (field !== "_skip") fieldToCol[field] = Number(idxStr);
  }

  const leads: ParsedLead[] = [];
  const errors: string[] = [];

  const get = (row: string[], field: string): string | undefined => {
    const idx = fieldToCol[field];
    return idx !== undefined ? row[idx]?.trim() || undefined : undefined;
  };

  rows.forEach((row, i) => {
    const name = get(row, "name");
    if (!name) {
      errors.push(`Row ${i + 2}: missing name, skipped.`);
      return;
    }

    const rawSource = get(row, "source")?.toLowerCase();
    const rawPriority = get(row, "priority")?.toUpperCase();

    leads.push({
      name,
      email: get(row, "email"),
      phone: get(row, "phone"),
      company: get(row, "company"),
      source: rawSource && isValidSource(rawSource) ? rawSource : undefined,
      notes: get(row, "notes"),
      city: get(row, "city"),
      designation: get(row, "designation"),
      referredBy: get(row, "referredBy"),
      potentialValue: get(row, "potentialValue"),
      investmentInterest: get(row, "investmentInterest"),
      whatsappNumber: get(row, "whatsappNumber"),
      website: get(row, "website"),
      priority:
        rawPriority && isValidPriority(rawPriority) ? rawPriority : undefined,
      tags: get(row, "tags"),
    });
  });

  return { leads, errors };
}

export function CsvUploadDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");

  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<number, string>>(
    {},
  );
  const [fileName, setFileName] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  const [parsed, setParsed] = useState<ParsedLead[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [autoDistribute, setAutoDistribute] = useState(true);

  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    updated: number;
    errors: { row: number; message: string }[];
    duplicatesFound: number;
    distributed?: number;
    salesPeopleCount?: number;
  } | null>(null);

  const bulkImport = useBulkImportLeads();

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
    const { leads, errors } = applyMapping(rawHeaders, rawRows, fieldMappings);
    setParsed(leads);
    setParseErrors(errors);
    setStep("preview");
  }, [rawHeaders, rawRows, fieldMappings]);

  const handleImport = useCallback(() => {
    if (!parsed?.length) return;
    bulkImport.mutate(
      {
        leads: parsed.map((l) => ({
          name: l.name,
          email: l.email || "",
          phone: l.phone,
          company: l.company,
          source: l.source,
          notes: l.notes,
          city: l.city,
          designation: l.designation,
          referredBy: l.referredBy,
          potentialValue: l.potentialValue,
          investmentInterest: l.investmentInterest,
          whatsappNumber: l.whatsappNumber,
          website: l.website,
          priority: l.priority,
          tags: l.tags ? l.tags.split(",").map((t) => t.trim()) : undefined,
        })),
        autoDistribute,
      },
      {
        onSuccess: (data) => {
          setImportResult(data);
          if (data.imported > 0) {
            toast.success(
              `Imported ${data.imported} leads${data.skipped ? `, ${data.skipped} skipped` : ""}`,
            );
            onSuccess?.();
          } else if (data.skipped > 0) {
            toast.warning(
              `All ${data.skipped} leads were duplicates and skipped`,
            );
          }
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [parsed, autoDistribute, bulkImport, onSuccess]);

  const downloadTemplate = useCallback(() => {
    const csv =
      "name,email,phone,company,source,notes,city,designation,priority,potential value,referred by\n" +
      "John Doe,john@example.com,+919876543210,Acme Corp,website,Interested in premium plan,Hyderabad,CEO,HOT,500000,Ravi Kumar\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-template.csv";
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
    setAutoDistribute(true);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const handleBrowseClick = useCallback(() => {
    document.getElementById("lead-file-upload")?.click();
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
          Import Leads
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-1">
          <DialogTitle>Import Leads</DialogTitle>
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
          <CsvUploadStepUpload
            onBrowseClick={handleBrowseClick}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onFileInputChange={handleFileInputChange}
            onDownloadTemplate={downloadTemplate}
          />
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
          <CsvFieldMapper
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
          <CsvUploadPreview
            fileName={fileName}
            parsed={parsed}
            parseErrors={parseErrors}
            importResult={importResult}
            autoDistribute={autoDistribute}
            isImporting={bulkImport.isPending}
            onAutoDistributeChange={setAutoDistribute}
            onEditMapping={handleEditMapping}
            onImport={handleImport}
            onClose={handleCloseAfterImport}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
