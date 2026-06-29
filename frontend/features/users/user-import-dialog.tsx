"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { getApiError } from "@/lib/api-client";
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface ImportRow {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  designation?: string;
  phone?: string;
}

interface ImportResult {
  results: Array<{ email: string; success: boolean; error?: string }>;
  succeeded: number;
  failed: number;
  total: number;
}

interface UserImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseCsv(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { if (cols[i]) row[h] = cols[i]; });
    return {
      email: row.email ?? "",
      firstName: row.firstname ?? row.first_name ?? undefined,
      lastName: row.lastname ?? row.last_name ?? undefined,
      role: row.role ?? undefined,
      designation: row.designation ?? row.title ?? undefined,
      phone: row.phone ?? undefined,
    };
  }).filter((r) => !!r.email);
}

export function UserImportDialog({ open, onOpenChange }: UserImportDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const { mutate: doImport, isPending } = useMutation<ImportResult, Error, ImportRow[]>({
    mutationFn: (rows) => apiClient.post<ImportResult>("/users/import", { rows }),
    onSuccess: (result) => {
      setImportResult(result);
      if (result.succeeded > 0) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.users.invitations() });
      }
    },
    onError: (e) => toast.error(getApiError(e)),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      setPreview(rows);
    };
    reader.readAsText(file);
  }

  function handleClose() {
    setPreview([]);
    setFileName(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
  }

  function handleImport() {
    if (preview.length > 0) doImport(preview);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Import Users from CSV</DialogTitle>
        </DialogHeader>

        {!importResult ? (
          <>
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground/50" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  {fileName ?? "Click to upload CSV file"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Required column: <code className="bg-muted px-0.5 rounded">email</code>
                  {" "}— Optional: <code className="bg-muted px-0.5 rounded">firstName</code>,{" "}
                  <code className="bg-muted px-0.5 rounded">lastName</code>,{" "}
                  <code className="bg-muted px-0.5 rounded">role</code>,{" "}
                  <code className="bg-muted px-0.5 rounded">designation</code>,{" "}
                  <code className="bg-muted px-0.5 rounded">phone</code>
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {preview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">{preview.length} users found</span>
                  <Badge variant="secondary" className="text-[10px]">Preview</Badge>
                </div>
                <div className="border rounded-md overflow-hidden max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b">
                      <tr>
                        <th className="text-left px-2 py-1.5 font-medium">Email</th>
                        <th className="text-left px-2 py-1.5 font-medium">Name</th>
                        <th className="text-left px-2 py-1.5 font-medium">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b last:border-b-0">
                          <td className="px-2 py-1 truncate max-w-[180px]">{row.email}</td>
                          <td className="px-2 py-1">{[row.firstName, row.lastName].filter(Boolean).join(" ") || "—"}</td>
                          <td className="px-2 py-1">{row.role ?? "MEMBER"}</td>
                        </tr>
                      ))}
                      {preview.length > 10 && (
                        <tr>
                          <td colSpan={3} className="px-2 py-1.5 text-muted-foreground text-center">
                            …and {preview.length - 10} more
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={preview.length === 0 || isPending}
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Import {preview.length > 0 ? `${preview.length} Users` : ""}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md border p-2">
                  <p className="text-lg font-semibold tabular-nums">{importResult.total}</p>
                  <p className="text-[11px] text-muted-foreground">Total</p>
                </div>
                <div className="rounded-md border border-green-200 bg-green-50 p-2">
                  <p className="text-lg font-semibold tabular-nums text-green-700">{importResult.succeeded}</p>
                  <p className="text-[11px] text-green-600">Invited</p>
                </div>
                <div className="rounded-md border border-red-200 bg-red-50 p-2">
                  <p className="text-lg font-semibold tabular-nums text-red-600">{importResult.failed}</p>
                  <p className="text-[11px] text-red-500">Failed</p>
                </div>
              </div>

              {importResult.results.some((r) => !r.success) && (
                <div className="border rounded-md overflow-hidden max-h-40 overflow-y-auto">
                  <div className="bg-red-50 border-b px-2 py-1 flex items-center gap-1.5 text-xs font-medium text-red-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Failed rows
                  </div>
                  {importResult.results.filter((r) => !r.success).map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 text-xs border-b last:border-b-0">
                      <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      <span className="truncate">{r.email}</span>
                      <span className="text-muted-foreground ml-auto shrink-0">{r.error}</span>
                    </div>
                  ))}
                </div>
              )}

              {importResult.succeeded > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  Invitation emails sent to {importResult.succeeded} user(s).
                </p>
              )}
            </div>

            <DialogFooter>
              <Button size="sm" onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
