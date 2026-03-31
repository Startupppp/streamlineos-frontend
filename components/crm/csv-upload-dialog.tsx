"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Download, AlertCircle, CheckCircle2, X } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface ParsedLead {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  notes?: string;
  city?: string;
  designation?: string;
  referredBy?: string;
  potentialValue?: string;
  investmentInterest?: string;
  whatsappNumber?: string;
  website?: string;
  priority?: string;
  tags?: string;
}

const VALID_SOURCES = ["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"];
const VALID_PRIORITIES = ["HOT", "WARM", "COLD"];
const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

/* ─── Header alias map for auto-detection ─── */
const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "lead name", "full name", "contact name", "lead"],
  email: ["email", "e-mail", "email address", "mail"],
  phone: ["phone", "mobile", "tel", "telephone", "contact number", "phone number", "mobile number"],
  company: ["company", "organization", "org", "firm", "company name"],
  source: ["source", "lead source", "channel"],
  notes: ["notes", "remarks", "comments", "description"],
  city: ["city", "location", "area"],
  designation: ["designation", "title", "role", "position", "job title"],
  referredBy: ["referred by", "referral", "referred", "referrer"],
  potentialValue: ["potential value", "value", "deal value", "amount", "budget"],
  investmentInterest: ["investment interest", "investment", "interest"],
  whatsappNumber: ["whatsapp", "whatsapp number", "wa number"],
  website: ["website", "url", "web"],
  priority: ["priority", "lead priority", "urgency"],
  tags: ["tags", "labels", "categories"],
};

function matchHeader(header: string): string | null {
  const h = header.toLowerCase().trim().replace(/[_\-]/g, " ");
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(h)) return field;
  }
  return null;
}

function rowToLead(row: string[], headers: string[]): { lead: ParsedLead | null; error: string | null } {
  const mapping: Record<string, number> = {};
  headers.forEach((h, i) => {
    const field = matchHeader(h);
    if (field) mapping[field] = i;
  });

  if (mapping.name === undefined) return { lead: null, error: "No 'name' column found" };

  const get = (field: string) => {
    const idx = mapping[field];
    return idx !== undefined ? row[idx]?.trim().replace(/^["']|["']$/g, "") || undefined : undefined;
  };

  const name = get("name");
  if (!name) return { lead: null, error: "Missing name" };

  const source = get("source")?.toLowerCase();
  const priority = get("priority")?.toUpperCase();

  return {
    lead: {
      name,
      email: get("email"),
      phone: get("phone"),
      company: get("company"),
      source: source && VALID_SOURCES.includes(source) ? source : undefined,
      notes: get("notes"),
      city: get("city"),
      designation: get("designation"),
      referredBy: get("referredBy"),
      potentialValue: get("potentialValue"),
      investmentInterest: get("investmentInterest"),
      whatsappNumber: get("whatsappNumber"),
      website: get("website"),
      priority: priority && VALID_PRIORITIES.includes(priority) ? priority : undefined,
      tags: get("tags"),
    },
    error: null,
  };
}

/* ─── CSV Parser ─── */
function parseCSV(text: string): { leads: ParsedLead[]; errors: string[] } {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { leads: [], errors: ["File must have a header row and at least one data row."] };

  const headers = lines[0].split(",").map(h => h.trim().replace(/['"]/g, ""));
  const leads: ParsedLead[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim());
    const { lead, error } = rowToLead(cols, headers);
    if (lead) {
      leads.push(lead);
    } else {
      errors.push(`Row ${i + 1}: ${error || "Invalid row"}, skipped.`);
    }
  }

  return { leads, errors };
}

/* ─── Excel Parser (ExcelJS) ─── */
async function parseExcel(buffer: ArrayBuffer): Promise<{ leads: ParsedLead[]; errors: string[] }> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    return { leads: [], errors: ["Excel file must have a header row and at least one data row."] };
  }

  // Extract headers from first row
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || "").trim();
  });

  const leads: ParsedLead[] = [];
  const errors: string[] = [];

  for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
    const row = sheet.getRow(rowIdx);
    const cols: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cols[colNumber - 1] = String(cell.value || "").trim();
    });

    // Skip completely empty rows
    if (cols.every(c => !c)) continue;

    const { lead, error } = rowToLead(cols, headers);
    if (lead) {
      leads.push(lead);
    } else {
      errors.push(`Row ${rowIdx}: ${error || "Invalid row"}, skipped.`);
    }
  }

  return { leads, errors };
}

function getFileExtension(name: string): string {
  return name.slice(name.lastIndexOf(".")).toLowerCase();
}

export function CsvUploadDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedLead[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [isParsing, setIsParsing] = useState(false);

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

  const bulkImport = api.leads.bulkImport.useMutation({
    onSuccess: (data) => {
      setImportResult(data);
      if (data.imported > 0) {
        toast.success(`Imported ${data.imported} leads${data.skipped ? `, ${data.skipped} skipped` : ""}`);
        onSuccess?.();
      } else if (data.skipped > 0) {
        toast.warning(`All ${data.skipped} leads were duplicates and skipped`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFile = useCallback(async (file: File) => {
    const ext = getFileExtension(file.name);
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error("Unsupported file format. Use .csv, .xlsx, or .xls");
      return;
    }

    setFileName(file.name);
    setIsParsing(true);

    try {
      if (ext === ".csv") {
        const text = await file.text();
        const { leads, errors } = parseCSV(text);
        setParsed(leads);
        setParseErrors(errors);
      } else {
        const buffer = await file.arrayBuffer();
        const { leads, errors } = await parseExcel(buffer);
        setParsed(leads);
        setParseErrors(errors);
      }
    } catch (err) {
      toast.error("Failed to parse file. Please check the format.");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = getFileExtension(file.name);
      if (ACCEPTED_EXTENSIONS.includes(ext)) {
        handleFile(file);
      } else {
        toast.error("Please drop a .csv, .xlsx, or .xls file");
      }
    }
  }, [handleFile]);

  const handleImport = () => {
    if (!parsed?.length) return;
    bulkImport.mutate({
      leads: parsed.map(l => ({
        name: l.name,
        email: l.email || "",
        phone: l.phone,
        company: l.company,
        source: l.source as "referral" | "campaign" | "cold_call" | "website" | "social_media" | "walk_in" | "other" | undefined,
        notes: l.notes,
        city: l.city,
        designation: l.designation,
        referredBy: l.referredBy,
        potentialValue: l.potentialValue,
        investmentInterest: l.investmentInterest,
        whatsappNumber: l.whatsappNumber,
        website: l.website,
        priority: l.priority as "HOT" | "WARM" | "COLD" | undefined,
        tags: l.tags ? l.tags.split(",").map(t => t.trim()) : undefined,
      })),
      autoDistribute,
    });
  };

  const downloadTemplate = () => {
    const csv = "name,email,phone,company,source,notes,city,designation,priority,potential value,referred by\nJohn Doe,john@example.com,+919876543210,Acme Corp,website,Interested in premium plan,Hyderabad,CEO,HOT,500000,Ravi Kumar\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setParsed(null);
    setParseErrors([]);
    setFileName("");
    setIsParsing(false);
    setImportResult(null);
    setAutoDistribute(true);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import Leads
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg overflow-y-auto p-6">
        <SheetHeader className="mb-4">
          <SheetTitle>Import Leads</SheetTitle>
        </SheetHeader>

        {!parsed && !isParsing ? (
          <div className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-[#bd882c]/50 transition-colors"
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">Drop your file here</p>
              <p className="text-xs text-muted-foreground mb-3">Supports .csv, .xlsx, and .xls</p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                id="lead-file-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <Button variant="outline" size="sm" onClick={() => document.getElementById("lead-file-upload")?.click()}>
                <FileText className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
            </div>

            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">
                Required: <code className="text-foreground">name</code>. Optional: email, phone, company, source, city, designation, priority, notes
              </p>
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5 mr-1" />
                Template
              </Button>
            </div>
          </div>
        ) : isParsing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 border-2 border-[#bd882c] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Parsing {fileName}...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#bd882c]" />
                <span className="text-sm font-medium">{fileName}</span>
                <Badge variant="secondary">{parsed!.length} leads</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>

            {parseErrors.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{parseErrors.length} warnings</span>
                </div>
                {parseErrors.slice(0, 5).map((err, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{err}</p>
                ))}
                {parseErrors.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-1">...and {parseErrors.length - 5} more</p>
                )}
              </div>
            )}

            {parsed && parsed.length > 0 && (
              <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Phone</TableHead>
                      <TableHead className="text-xs">Company</TableHead>
                      <TableHead className="text-xs">Source</TableHead>
                      <TableHead className="text-xs">Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.slice(0, 20).map((lead, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-medium">{lead.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{lead.email || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{lead.phone || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{lead.company || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {lead.source ? <Badge variant="outline" className="text-[10px]">{lead.source}</Badge> : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {lead.priority ? <Badge variant="outline" className="text-[10px]">{lead.priority}</Badge> : "—"}
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
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Import Complete</p>
                  <p className="text-xs text-muted-foreground">{importResult.imported} imported, {importResult.skipped} skipped, {importResult.updated} updated</p>
                  {importResult.distributed && importResult.distributed > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {importResult.distributed} leads distributed to {importResult.salesPeopleCount} sales rep{(importResult.salesPeopleCount ?? 0) > 1 ? "s" : ""} ({Math.floor(importResult.distributed / (importResult.salesPeopleCount || 1))} each)
                    </p>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <p key={i} className="text-xs text-destructive">Row {err.row}: {err.message}</p>
                      ))}
                      {importResult.errors.length > 5 && (
                        <p className="text-xs text-muted-foreground">...and {importResult.errors.length - 5} more errors</p>
                      )}
                    </div>
                  )}
                </div>
                <Button className="w-full" variant="outline" onClick={() => { setOpen(false); reset(); }}>
                  Close
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="flex items-center gap-2.5 rounded-lg border bg-muted/30 px-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDistribute}
                    onChange={(e) => setAutoDistribute(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-[#bd882c]"
                  />
                  <div>
                    <p className="text-sm font-medium leading-none">Auto-distribute to sales team</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Evenly split imported leads across active sales reps</p>
                  </div>
                </label>

                <Button
                  className="w-full bg-[#bd882c] hover:bg-[#a67724] text-white"
                  onClick={handleImport}
                  disabled={bulkImport.isPending || !parsed?.length}
                >
                  {bulkImport.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Import {parsed?.length || 0} Leads
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
