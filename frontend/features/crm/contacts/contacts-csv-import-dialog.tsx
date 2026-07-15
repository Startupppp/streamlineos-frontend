"use client";

import { useState, useCallback } from "react";
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
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { CsvColumnMapper } from "@/features/crm/contacts/csv-column-mapper";
import { CsvContactsPreview, isValidSource } from "@/features/crm/contacts/csv-contacts-preview";
import type { ParsedContact } from "@/features/crm/contacts/csv-contacts-preview";

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

const HEADER_ALIASES: Record<string, string[]> = {
  first_name: ["firstname", "first name", "fname", "givenname", "given name"],
  last_name: [
    "lastname",
    "last name",
    "lname",
    "surname",
    "family name",
    "familyname",
  ],
  email: ["email", "email address", "mail", "email"],
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
  title: ["title", "job title", "position", "role", "designation"],
  source: ["source", "lead source", "channel"],
  notes: ["notes", "remarks", "comments", "description"],
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
): { contacts: ParsedContact[]; errors: string[] } {
  const fieldToCol: Record<string, number> = {};
  for (const [idxStr, field] of Object.entries(fieldMappings)) {
    if (field !== "_skip") fieldToCol[field] = Number(idxStr);
  }

  const contacts: ParsedContact[] = [];
  const errors: string[] = [];

  const get = (row: string[], field: string): string | undefined => {
    const idx = fieldToCol[field];
    return idx !== undefined ? row[idx]?.trim() || undefined : undefined;
  };

  rows.forEach((row, i) => {
    const firstName = get(row, "first_name");
    if (!firstName) {
      errors.push(`Row ${i + 2}: missing first name, skipped.`);
      return;
    }
    const lastName = get(row, "last_name");
    const name = lastName ? `${firstName} ${lastName}` : firstName;
    const rawSource = get(row, "source")?.toLowerCase();

    contacts.push({
      name,
      email: get(row, "email"),
      phone: get(row, "phone"),
      company: get(row, "company"),
      title: get(row, "title"),
      source: rawSource && isValidSource(rawSource) ? rawSource : undefined,
      notes: get(row, "notes"),
    });
  });

  return { contacts, errors };
}

function useBulkImportContacts() {
  return useMutation({
    mutationKey: ["contacts", "bulk-import"],
    mutationFn: (contacts: ParsedContact[]) =>
      apiClient.post<{ created: number; failed: number }>(
        "/contacts/bulk-import",
        { contacts },
      ),
  });
}

export function ContactsCsvImportDialog({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<number, string>>(
    {},
  );
  const [fileName, setFileName] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedContact[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    created: number;
    failed: number;
  } | null>(null);

  const bulkImport = useBulkImportContacts();

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

  const handleConfirmMapping = useCallback(() => {
    const { contacts, errors } = applyMapping(
      rawHeaders,
      rawRows,
      fieldMappings,
    );
    setParsed(contacts);
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
            `${data.created} contacts imported${data.failed ? `, ${data.failed} failed` : ""}`,
          );
          onSuccess?.();
        } else {
          toast.warning("No contacts were imported");
        }
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [parsed, bulkImport, onSuccess]);

  const downloadTemplate = useCallback(() => {
    const csv =
      "first_name,last_name,email,phone,company,title,source,notes\n" +
      "Jane,Doe,jane@example.com,+919876543210,Acme Corp,VP Sales,website,Interested in enterprise plan\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-template.csv";
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
    document.getElementById("contact-file-upload")?.click();
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
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-1">
          <DialogTitle>Import Contacts</DialogTitle>
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
              onDragOver={(e) => e.preventDefault()}
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
                id="contact-file-upload"
                aria-label="Upload contacts file"
                onChange={handleFileInputChange}
              />
              <Button variant="outline" size="sm" onClick={handleBrowseClick}>
                <FileText className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
            </div>
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">
                Required:{" "}
                <code className="text-foreground">first_name</code>. Optional:
                last_name, email, phone, company, title, source, notes
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
          <CsvColumnMapper
            fileName={fileName}
            rawHeaders={rawHeaders}
            rawRows={rawRows}
            fieldMappings={fieldMappings}
            onMappingChange={setFieldMappings}
            onConfirm={handleConfirmMapping}
            onBack={reset}
          />
        )}

        {step === "preview" && parsed !== null && (
          <CsvContactsPreview
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
