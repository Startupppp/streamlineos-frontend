"use client";

import { useCallback } from "react";
import { FileText, AlertCircle, CheckCircle2, ChevronLeft } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

interface ImportResult {
  imported: number;
  skipped: number;
  updated: number;
  errors: { row: number; message: string }[];
  duplicatesFound: number;
  distributed?: number;
  salesPeopleCount?: number;
}

interface CsvUploadPreviewProps {
  fileName: string;
  parsed: ParsedLead[];
  parseErrors: string[];
  importResult: ImportResult | null;
  autoDistribute: boolean;
  isImporting: boolean;
  onAutoDistributeChange: (checked: boolean) => void;
  onEditMapping: () => void;
  onImport: () => void;
  onClose: () => void;
}

interface ParsedLeadWithIdx extends ParsedLead {
  _idx: number;
}

export function CsvUploadPreview({
  fileName,
  parsed,
  parseErrors,
  importResult,
  autoDistribute,
  isImporting,
  onAutoDistributeChange,
  onEditMapping,
  onImport,
  onClose,
}: CsvUploadPreviewProps) {
  const handleAutoDistributeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onAutoDistributeChange(e.target.checked),
    [onAutoDistributeChange],
  );

  const indexedParsed: ParsedLeadWithIdx[] = parsed.slice(0, 20).map((l, i) => ({ ...l, _idx: i }));

  const columns: DataTableColumn<ParsedLeadWithIdx>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => <span className="text-xs font-medium">{row.name}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.email || "—"}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.phone || "—"}</span>,
    },
    {
      key: "company",
      header: "Company",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.company || "—"}</span>,
    },
    {
      key: "source",
      header: "Source",
      cell: (row) => row.source ? (
        <Badge variant="outline" className="text-micro">{row.source}</Badge>
      ) : "—",
    },
    {
      key: "priority",
      header: "Priority",
      cell: (row) => row.priority ? (
        <Badge variant="outline" className="text-micro">{row.priority}</Badge>
      ) : "—",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{fileName}</span>
          <Badge variant="secondary">{parsed.length} leads</Badge>
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
            <p key={i} className="text-xs text-muted-foreground">{err}</p>
          ))}
          {parseErrors.length > 5 && (
            <p className="text-xs text-muted-foreground mt-1">
              ...and {parseErrors.length - 5} more
            </p>
          )}
        </div>
      )}

      {parsed.length > 0 && (
        <>
          <DataTable
            data={indexedParsed}
            columns={columns}
            getRowKey={(row) => row._idx}
          />
          {parsed.length > 20 && (
            <p className="text-xs text-center text-muted-foreground py-2">
              ...and {parsed.length - 20} more
            </p>
          )}
        </>
      )}

      {importResult ? (
        <div className="space-y-3">
          <div className="bg-status-success-surface border border-status-success-rule rounded-lg p-3 space-y-1">
            <p className="text-sm font-medium text-status-success-ink">
              Import Complete
            </p>
            <p className="text-xs text-muted-foreground">
              {importResult.imported} imported, {importResult.skipped} skipped,{" "}
              {importResult.updated} updated
            </p>
            {importResult.distributed && importResult.distributed > 0 && (
              <p className="text-xs text-primary font-medium">
                {importResult.distributed} leads distributed to{" "}
                {importResult.salesPeopleCount} sales rep
                {(importResult.salesPeopleCount ?? 0) > 1 ? "s" : ""} (
                {Math.floor(
                  importResult.distributed / (importResult.salesPeopleCount || 1),
                )}{" "}
                each)
              </p>
            )}
            {importResult.errors.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {importResult.errors.slice(0, 5).map((err, i) => (
                  <p key={i} className="text-xs text-destructive">
                    Row {err.row}: {err.message}
                  </p>
                ))}
                {importResult.errors.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ...and {importResult.errors.length - 5} more errors
                  </p>
                )}
              </div>
            )}
          </div>
          <Button className="w-full" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center gap-2.5 rounded-lg border bg-muted/30 px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoDistribute}
              onChange={handleAutoDistributeChange}
              className="h-4 w-4 rounded border-input accent-gold"
            />
            <div>
              <p className="text-sm font-medium leading-none">
                Auto-distribute to sales team
              </p>
              <p className="text-dense text-muted-foreground mt-0.5">
                Evenly split imported leads across active sales reps
              </p>
            </div>
          </label>

          <Button
            className="w-full"
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
                Import {parsed.length || 0} Leads
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
