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
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const importUsersContract = lazyContract(() =>
  import("@/hooks/api/users/extended-users-schema").then((m) => m.importUsersContract),
);
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Users, UserCheck, UserMinus } from "lucide-react";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useMutation } from "@tanstack/react-query";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatRoleLabel } from "@/lib/constants/user-invite-roles";

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

type IndexedImportRow = ImportRow & { _idx: number };

const PREVIEW_COLUMNS: DataTableColumn<IndexedImportRow>[] = [
  {
    key: "email",
    header: "Email",
    cell: (row) => <span className="truncate max-w-[180px] block">{row.email}</span>,
    className: "px-2 py-1",
  },
  {
    key: "name",
    header: "Name",
    cell: (row) => (
      <span>{[row.firstName, row.lastName].filter(Boolean).join(" ") || "—"}</span>
    ),
    className: "px-2 py-1",
  },
  {
    key: "role",
    header: "Role",
    cell: (row) => <span>{formatRoleLabel(row.role ?? "MEMBER")}</span>,
    className: "px-2 py-1",
  },
];

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
    mutationKey: ["users", "import"],
    mutationFn: (rows) => apiClient.post<ImportResult>("/users/import", { rows }, undefined, importUsersContract),
    onSuccess: (result) => {
      setImportResult(result);
      if (result.succeeded > 0) {
        void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.all });
        void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.stats() });
        void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.invitations() });
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleChooseFile() {
    fileInputRef.current?.click();
  }

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
            <button
              type="button"
              className="w-full border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-muted-foreground/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={handleChooseFile}
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
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />

            {preview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">{preview.length} users found</span>
                  <Badge variant="secondary" className="text-micro">Preview</Badge>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  <DataTable
                    data={preview.slice(0, 10).map((row, i) => ({ ...row, _idx: i }))}
                    columns={PREVIEW_COLUMNS}
                    getRowKey={(row) => row._idx}
                    className="text-xs"
                    footer={
                      preview.length > 10 ? (
                        <span className="text-muted-foreground text-center block">
                          …and {preview.length - 10} more
                        </span>
                      ) : undefined
                    }
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
                Cancel
              </Button>
              <LoadingButton
                size="sm"
                onClick={handleImport}
                isPending={isPending}
                loadingText="Importing…"
                disabled={preview.length === 0}
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Import {preview.length > 0 ? `${preview.length} Users` : ""}
              </LoadingButton>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <StatCardGrid cols={3}>
                <StatCard label="Total" value={importResult.total} icon={Users} tone="default" />
                <StatCard label="Invited" value={importResult.succeeded} icon={UserCheck} tone="emerald" />
                <StatCard label="Failed" value={importResult.failed} icon={UserMinus} tone="red" />
              </StatCardGrid>

              {importResult.results.some((r) => !r.success) && (
                <div className="border rounded-md overflow-hidden max-h-40 overflow-y-auto">
                  <div className="bg-status-danger-surface border-b px-2 py-1 flex items-center gap-1.5 text-xs font-medium text-status-danger-ink">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Failed rows
                  </div>
                  {importResult.results.filter((r) => !r.success).map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 text-xs border-b last:border-b-0">
                      <XCircle className="h-3.5 w-3.5 text-status-danger-ink shrink-0" />
                      <span className="truncate">{r.email}</span>
                      <span className="text-muted-foreground ml-auto shrink-0">{r.error}</span>
                    </div>
                  ))}
                </div>
              )}

              {importResult.succeeded > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-status-success-ink" />
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
