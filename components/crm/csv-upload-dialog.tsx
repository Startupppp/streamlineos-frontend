"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Download, AlertCircle, CheckCircle2, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
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
}

const VALID_SOURCES = ["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"];

function parseCSV(text: string): { leads: ParsedLead[]; errors: string[] } {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { leads: [], errors: ["CSV must have a header row and at least one data row."] };

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
  const nameIdx = headers.findIndex(h => h === "name" || h === "lead name");
  if (nameIdx === -1) return { leads: [], errors: ["CSV must have a 'name' column."] };

  const emailIdx = headers.findIndex(h => h === "email" || h === "e-mail");
  const phoneIdx = headers.findIndex(h => h === "phone" || h === "mobile");
  const companyIdx = headers.findIndex(h => h === "company" || h === "organization");
  const sourceIdx = headers.findIndex(h => h === "source" || h === "lead source");
  const notesIdx = headers.findIndex(h => h === "notes" || h === "remarks");

  const leads: ParsedLead[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
    const name = cols[nameIdx]?.trim();
    if (!name) {
      errors.push(`Row ${i + 1}: Missing name, skipped.`);
      continue;
    }

    const source = sourceIdx >= 0 ? cols[sourceIdx]?.toLowerCase() : undefined;

    leads.push({
      name,
      email: emailIdx >= 0 ? cols[emailIdx] || undefined : undefined,
      phone: phoneIdx >= 0 ? cols[phoneIdx] || undefined : undefined,
      company: companyIdx >= 0 ? cols[companyIdx] || undefined : undefined,
      source: source && VALID_SOURCES.includes(source) ? source : undefined,
      notes: notesIdx >= 0 ? cols[notesIdx] || undefined : undefined,
    });
  }

  return { leads, errors };
}

export function CsvUploadDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedLead[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");

  const bulkImport = api.leads.bulkImport.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully imported ${data.imported} leads`);
      setParsed(null);
      setFileName("");
      setOpen(false);
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { leads, errors } = parseCSV(text);
      setParsed(leads);
      setParseErrors(errors);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      handleFile(file);
    } else {
      toast.error("Please drop a .csv file");
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
      })),
    });
  };

  const downloadTemplate = () => {
    const csv = "name,email,phone,company,source,notes\nJohn Doe,john@example.com,+919876543210,Acme Corp,website,Interested in premium plan\n";
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
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
        </DialogHeader>

        {!parsed ? (
          <div className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-[#bd882c]/50 transition-colors"
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">Drop your CSV file here</p>
              <p className="text-xs text-muted-foreground mb-3">or click to browse</p>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                id="csv-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <Button variant="outline" size="sm" onClick={() => document.getElementById("csv-upload")?.click()}>
                <FileText className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
            </div>

            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">
                Required: <code className="text-foreground">name</code>. Optional: email, phone, company, source, notes
              </p>
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5 mr-1" />
                Template
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#bd882c]" />
                <span className="text-sm font-medium">{fileName}</span>
                <Badge variant="secondary">{parsed.length} leads</Badge>
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
              </div>
            )}

            {parsed.length > 0 && (
              <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Phone</TableHead>
                      <TableHead className="text-xs">Company</TableHead>
                      <TableHead className="text-xs">Source</TableHead>
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

            <Button
              className="w-full bg-[#bd882c] hover:bg-[#a67724] text-white"
              onClick={handleImport}
              disabled={bulkImport.isPending || parsed.length === 0}
            >
              {bulkImport.isPending ? (
                "Importing..."
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Import {parsed.length} Leads
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
