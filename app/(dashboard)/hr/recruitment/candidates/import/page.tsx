"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";

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

type Step = "upload" | "map" | "preview" | "done";

export default function BulkImportPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
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
        const XLSX = (await import("xlsx")).default;
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        if (jsonData.length === 0) { toast.error("No data found in file"); return; }
        parsedHeaders = Object.keys(jsonData[0]!);
        parsedRows = jsonData.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v)])));
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

      setHeaders(parsedHeaders);
      setRows(parsedRows.slice(0, 500));
      setFieldMap(autoMap);
      setStep("map");
    } catch {
      toast.error("Failed to parse file. Please check the format.");
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleImport = useCallback(async () => {
    const mappedRows = rows.map((row) => {
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
    }).filter((r) => r.email && r.firstName && r.lastName);

    if (mappedRows.length === 0) {
      toast.error("No valid rows to import. Email, First Name, and Last Name are required.");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/hr/recruitment/candidates/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRows }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Import failed"); return; }
      setImportResult(data);
      setStep("done");
      void qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setImporting(false);
    }
  }, [rows, fieldMap, qc]);

  const requiredMapped = CANDIDATE_FIELDS.filter((f) => f.required).every((f) => fieldMap[f.key]);
  const previewRows = rows.slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/hr/recruitment/candidates")} className="h-8 w-8">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Bulk Import Candidates</h1>
          <p className="text-sm text-muted-foreground">Upload a CSV or Excel file to import candidates</p>
        </div>
      </div>

      <div className="flex gap-2 text-xs">
        {(["upload", "map", "preview", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step === s ? "bg-primary text-primary-foreground" : ["map", "preview", "done"].indexOf(s) <= ["upload", "map", "preview", "done"].indexOf(step) ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              {i + 1}
            </div>
            <span className={step === s ? "font-medium" : "text-muted-foreground capitalize"}>{s}</span>
            {i < 3 && <svg className="h-3 w-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>}
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
            <div
              className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary/60 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="h-10 w-10 mx-auto mb-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="font-medium text-sm">Drag & drop or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">CSV, XLSX, or XLS — up to 500 rows</p>
            </div>
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
                <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                  <div className="flex items-center gap-1.5 text-sm">
                    <span>{field.label}</span>
                    {field.required && <Badge variant="outline" className="text-[10px] h-4 px-1">required</Badge>}
                  </div>
                  <Select
                    value={fieldMap[field.key] ?? "__none__"}
                    onValueChange={(v) => setFieldMap((prev) => ({ ...prev, [field.key]: v === "__none__" ? "" : v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
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
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={() => setStep("preview")} disabled={!requiredMapped}>
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
            <div className="overflow-x-auto rounded-lg border mb-4">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    {CANDIDATE_FIELDS.filter((f) => fieldMap[f.key]).map((f) => (
                      <th key={f.key} className="px-3 py-2 text-left font-medium">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-t">
                      {CANDIDATE_FIELDS.filter((f) => fieldMap[f.key]).map((f) => {
                        const header = fieldMap[f.key]!;
                        return (
                          <td key={f.key} className="px-3 py-2 max-w-[160px] truncate">
                            {row[header] ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("map")}>Back</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importing…" : `Import ${rows.length} Candidates`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && importResult && (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <svg className="h-7 w-7 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="font-semibold text-lg">Import Complete</p>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{importResult.created}</p>
                <p className="text-muted-foreground text-xs">Created</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{importResult.skipped}</p>
                <p className="text-muted-foreground text-xs">Skipped (duplicates)</p>
              </div>
            </div>
            <div className="flex gap-3 justify-center mt-6">
              <Button onClick={() => router.push("/hr/recruitment/candidates")}>
                View Candidates
              </Button>
              <Button variant="outline" onClick={() => { setStep("upload"); setHeaders([]); setRows([]); setFieldMap({}); setImportResult(null); }}>
                Import More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
