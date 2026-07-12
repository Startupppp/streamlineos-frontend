"use client";

import { AlertCircle, CheckCircle2, ChevronLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const VALID_SOURCES = [
  "referral",
  "campaign",
  "cold_call",
  "website",
  "social_media",
  "walk_in",
  "other",
] as const;
type ValidSource = (typeof VALID_SOURCES)[number];

export interface ParsedContact {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  source?: ValidSource;
  notes?: string;
}

export function isValidSource(s: string): s is ValidSource {
  return (VALID_SOURCES as readonly string[]).includes(s);
}

interface CsvContactsPreviewProps {
  fileName: string;
  parsed: ParsedContact[];
  parseErrors: string[];
  importResult: { created: number; failed: number } | null;
  isImporting: boolean;
  onEditMapping: () => void;
  onImport: () => void;
  onClose: () => void;
}

export function CsvContactsPreview({
  fileName,
  parsed,
  parseErrors,
  importResult,
  isImporting,
  onEditMapping,
  onImport,
  onClose,
}: CsvContactsPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">{fileName}</span>
          <Badge variant="secondary">{parsed.length} contacts</Badge>
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
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Company</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsed.slice(0, 20).map((contact, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">
                    {contact.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {contact.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {contact.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {contact.company ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {contact.title ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {contact.source ? (
                      <Badge variant="outline" className="text-[10px]">
                        {contact.source}
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
              {importResult.created} contacts created
              {importResult.failed > 0 ? `, ${importResult.failed} failed` : ""}
            </p>
          </div>
          <Button className="w-full" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <LoadingButton
          className="w-full"
          onClick={onImport}
          isPending={isImporting}
          loadingText="Importing..."
          disabled={isImporting || !parsed.length}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Import {parsed.length} Contacts
        </LoadingButton>
      )}
    </div>
  );
}
