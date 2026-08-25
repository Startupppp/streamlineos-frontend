"use client";

import { AlertCircle, CheckCircle2, ChevronLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";

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

interface ParsedContactWithIdx extends ParsedContact {
  _idx: number;
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

const contactColumns: DataTableColumn<ParsedContactWithIdx>[] = [
  {
    key: "name",
    header: "Name",
    cell: (row) => <span className="text-xs font-medium">{row.name}</span>,
  },
  {
    key: "email",
    header: "Email",
    cell: (row) => <span className="text-xs text-muted-foreground">{row.email ?? "—"}</span>,
  },
  {
    key: "phone",
    header: "Phone",
    cell: (row) => <span className="text-xs text-muted-foreground">{row.phone ?? "—"}</span>,
  },
  {
    key: "company",
    header: "Company",
    cell: (row) => <span className="text-xs text-muted-foreground">{row.company ?? "—"}</span>,
  },
  {
    key: "title",
    header: "Title",
    className: TABLE_TITLE_CELL,
    cell: (row) => row.title
      ? <TruncatedText text={row.title} className="text-xs text-muted-foreground" />
      : <span className="text-xs text-muted-foreground">—</span>,
  },
  {
    key: "source",
    header: "Source",
    cell: (row) =>
      row.source ? (
        <Badge variant="outline" className="text-micro">
          {row.source}
        </Badge>
      ) : (
        "—"
      ),
  },
];

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
  const indexedParsed: ParsedContactWithIdx[] = parsed
    .slice(0, 20)
    .map((c, i) => ({ ...c, _idx: i }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
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
        <>
          <DataTable
            data={indexedParsed}
            columns={contactColumns}
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