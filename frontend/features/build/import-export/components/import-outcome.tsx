"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { downloadTextFile } from "../download-text-file";
import {
  errorReportFilename,
  previewIssuesCsv,
  reportFailuresCsv,
} from "../import-error-report";
import {
  failedRows,
  previewHeadline,
  reportHeadline,
  rowsNeedingAttention,
} from "../import-preview-model";
import type { TicketImportPreview, TicketImportReport } from "../import-export-contract";

interface OutcomeRow {
  rowNumber: number;
  tag: string;
  detail: string;
}

interface OutcomeListProps {
  caption: string;
  rows: readonly OutcomeRow[];
}

function OutcomeList({ caption, rows }: OutcomeListProps) {
  function renderRow(row: OutcomeRow) {
    return (
      <TableRow key={`${row.rowNumber}-${row.tag}`}>
        <TableCell className="font-mono tabular-nums">{row.rowNumber}</TableCell>
        <TableCell>
          <Badge variant="destructive">{row.tag}</Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">{row.detail}</TableCell>
      </TableRow>
    );
  }

  if (rows.length === 0) return null;

  return (
    <ScrollArea className="max-h-56 rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Row</TableHead>
            <TableHead className="w-44">{caption}</TableHead>
            <TableHead>Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{rows.map(renderRow)}</TableBody>
      </Table>
    </ScrollArea>
  );
}

interface ImportPreviewOutcomeProps {
  preview: TicketImportPreview;
}

export function ImportPreviewOutcome({ preview }: ImportPreviewOutcomeProps) {
  const attention = rowsNeedingAttention(preview);

  function handleDownloadIssues() {
    downloadTextFile(
      errorReportFilename(preview.projectId, "preview"),
      "text/csv",
      previewIssuesCsv(preview),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{previewHeadline(preview)}</p>
        {attention.length > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadIssues}>
            Download row errors
          </Button>
        ) : null}
      </div>
      <OutcomeList
        caption="Why it is skipped"
        rows={attention.map((row) => ({
          rowNumber: row.rowNumber,
          tag: row.state,
          detail: row.issues.map((issue) => issue.message).join("; "),
        }))}
      />
    </div>
  );
}

interface ImportReportOutcomeProps {
  report: TicketImportReport;
}

export function ImportReportOutcome({ report }: ImportReportOutcomeProps) {
  const failures = failedRows(report);

  function handleDownloadFailures() {
    downloadTextFile(
      errorReportFilename(report.projectId, "commit"),
      "text/csv",
      reportFailuresCsv(report),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{reportHeadline(report)}</p>
        {failures.length > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadFailures}>
            Download failed rows
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="font-mono tabular-nums">{report.summary.imported}</span> imported ·{" "}
        <span className="font-mono tabular-nums">{report.summary.skipped}</span> skipped ·{" "}
        <span className="font-mono tabular-nums">{report.summary.failed}</span> failed ·{" "}
        <span className="font-mono tabular-nums">{report.summary.rolledBack}</span> rolled
        back
      </p>
      <OutcomeList
        caption="Outcome"
        rows={failures.map((row) => ({
          rowNumber: row.rowNumber,
          tag: row.outcome,
          detail: row.message ?? "",
        }))}
      />
    </div>
  );
}
