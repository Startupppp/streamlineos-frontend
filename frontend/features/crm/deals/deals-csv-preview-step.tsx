"use client";

import { FileText, ChevronLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
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
        <div className="border rounded-lg overflow-hidden max-h-[260px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Value</TableHead>
                <TableHead className="text-xs">Stage</TableHead>
                <TableHead className="text-xs">Owner Email</TableHead>
                <TableHead className="text-xs">Close Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsed.slice(0, 20).map((deal, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">
                    {deal.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {deal.value !== undefined
                      ? `₹${deal.value.toLocaleString()}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {deal.stage ? (
                      <Badge variant="outline" className="text-[10px]">
                        {deal.stage}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {deal.ownerEmail || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {deal.expectedCloseDate || "—"}
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
