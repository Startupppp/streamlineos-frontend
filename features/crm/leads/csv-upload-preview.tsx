"use client";

import { FileText, AlertCircle, CheckCircle2, ChevronLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
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
        <div className="border rounded-lg overflow-hidden max-h-[260px] overflow-y-auto">
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
                  <TableCell className="text-xs text-muted-foreground">
                    {lead.email || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {lead.phone || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {lead.company || "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {lead.source ? (
                      <Badge variant="outline" className="text-[10px]">
                        {lead.source}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {lead.priority ? (
                      <Badge variant="outline" className="text-[10px]">
                        {lead.priority}
                      </Badge>
                    ) : (
                      "—"
                    )}
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
              {importResult.imported} imported, {importResult.skipped} skipped,{" "}
              {importResult.updated} updated
            </p>
            {importResult.distributed && importResult.distributed > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
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
              onChange={(e) => onAutoDistributeChange(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-gold"
            />
            <div>
              <p className="text-sm font-medium leading-none">
                Auto-distribute to sales team
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
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
