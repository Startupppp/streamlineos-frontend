"use client";

import { FileText, ChevronLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import type { ParsedDeal } from "./deals-csv-mapping-step";

export interface DealsPreviewStepProps {
  fileName: string;
  parsed: ParsedDeal[];
  parseErrors: string[];
  importResult: { created: number; failed: number } | null;
  isImporting: boolean;
  onEditMapping: () => void;
  onImport: () => void;
  onClose: () => void;
}

interface ParsedDealWithIdx extends ParsedDeal {
  _idx: number;
}

export function DealsPreviewStep({
  fileName,
  parsed,
  parseErrors,
  importResult,
  isImporting,
  onEditMapping,
  onImport,
  onClose,
}: DealsPreviewStepProps) {
  const indexedParsed: ParsedDealWithIdx[] = parsed.slice(0, 20).map((d, i) => ({ ...d, _idx: i }));

  const columns: DataTableColumn<ParsedDealWithIdx>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => <span className="text-xs font-medium">{row.name}</span>,
    },
    {
      key: "value",
      header: "Value",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.value !== undefined ? `₹${row.value.toLocaleString()}` : "—"}
        </span>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      cell: (row) => row.stage ? (
        <Badge variant="outline" className="text-[10px]">{row.stage}</Badge>
      ) : "—",
    },
    {
      key: "ownerEmail",
      header: "Owner Email",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.ownerEmail || "—"}</span>,
    },
    {
      key: "expectedCloseDate",
      header: "Close Date",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.expectedCloseDate || "—"}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
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
        <LoadingButton
          type="button"
          className="w-full"
          isPending={isImporting}
          loadingText="Importing..."
          disabled={!parsed.length}
          onClick={onImport}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Import {parsed.length} Deals
        </LoadingButton>
      )}
    </div>
  );
}
