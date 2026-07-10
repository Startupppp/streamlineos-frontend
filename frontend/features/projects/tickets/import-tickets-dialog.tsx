"use client";

import { useState, useCallback, useRef } from "react";
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
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useImportTickets, type ImportTicketRow } from "@/hooks/api/projects/import-export";

const CSV_COLUMNS = ["title", "type", "status", "priority", "points", "assigneeEmail", "dueDate"] as const;
type CsvColumn = (typeof CSV_COLUMNS)[number];

const MAX_ROWS = 500;

function parseCSV(raw: string): ImportTicketRow[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));

  const colIndex: Record<CsvColumn, number> = {
    title: -1,
    type: -1,
    status: -1,
    priority: -1,
    points: -1,
    assigneeEmail: -1,
    dueDate: -1,
  };

  for (const col of CSV_COLUMNS) {
    const aliases: Record<CsvColumn, string[]> = {
      title: ["title", "name", "summary"],
      type: ["type"],
      status: ["status"],
      priority: ["priority"],
      points: ["points", "storypoints", "estimate"],
      assigneeEmail: ["assigneeemail", "email", "assignee"],
      dueDate: ["duedate", "due"],
    };
    const idx = headers.findIndex((h) => aliases[col].includes(h));
    colIndex[col] = idx;
  }

  if (colIndex.title === -1) return [];

  const rows: ImportTicketRow[] = [];
  for (let i = 1; i < lines.length && rows.length < MAX_ROWS; i++) {
    const cells = splitCsvLine(lines[i]);
    const title = cells[colIndex.title]?.trim();
    if (!title) continue;

    const row: ImportTicketRow = { title };

    const typeVal = colIndex.type >= 0 ? cells[colIndex.type]?.trim().toUpperCase() : undefined;
    if (typeVal && ["TASK", "BUG", "STORY", "EPIC"].includes(typeVal)) {
      row.type = typeVal as ImportTicketRow["type"];
    }

    if (colIndex.status >= 0) {
      const v = cells[colIndex.status]?.trim();
      if (v) row.status = v;
    }

    const priVal = colIndex.priority >= 0 ? cells[colIndex.priority]?.trim().toUpperCase() : undefined;
    if (priVal && ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priVal)) {
      row.priority = priVal as ImportTicketRow["priority"];
    }

    if (colIndex.points >= 0) {
      const v = parseInt(cells[colIndex.points]?.trim() ?? "");
      if (!isNaN(v) && v >= 0) row.points = v;
    }

    if (colIndex.assigneeEmail >= 0) {
      const v = cells[colIndex.assigneeEmail]?.trim();
      if (v) row.assigneeEmail = v;
    }

    if (colIndex.dueDate >= 0) {
      const v = cells[colIndex.dueDate]?.trim();
      if (v) row.dueDate = v;
    }

    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

interface ImportTicketsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
}

export function ImportTicketsDialog({ open, onOpenChange, projectId }: ImportTicketsDialogProps) {
  const [rows, setRows] = useState<ImportTicketRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportTickets(projectId);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text !== "string") return;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setParseError("No valid rows found. Make sure the CSV has a 'title' column.");
        setRows([]);
      } else {
        setParseError(null);
        setRows(parsed);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleClear = useCallback(() => {
    setRows([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSubmit = useCallback(() => {
    if (rows.length === 0) return;
    importMutation.mutate(
      { rows },
      {
        onSuccess: (result) => {
          toast.success(`Imported ${result.created} ticket${result.created !== 1 ? "s" : ""}`);
          if (result.skipped.length > 0) {
            result.skipped.slice(0, 5).forEach(({ row, reason }) => {
              toast.warning(`Row ${row} skipped: ${reason}`);
            });
            if (result.skipped.length > 5) {
              toast.warning(`${result.skipped.length - 5} more rows were skipped`);
            }
          }
          onOpenChange(false);
          handleClear();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [rows, importMutation, onOpenChange, handleClear]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) handleClear();
      onOpenChange(next);
    },
    [onOpenChange, handleClear],
  );

  const capped = rows.length >= MAX_ROWS;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Tickets from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Upload a CSV file with columns:{" "}
            <span className="font-mono text-xs">title</span>,{" "}
            <span className="font-mono text-xs">type</span>,{" "}
            <span className="font-mono text-xs">status</span>,{" "}
            <span className="font-mono text-xs">priority</span>,{" "}
            <span className="font-mono text-xs">points</span>,{" "}
            <span className="font-mono text-xs">assigneeEmail</span>,{" "}
            <span className="font-mono text-xs">dueDate</span>. Only{" "}
            <span className="font-mono text-xs">title</span> is required. Max {MAX_ROWS} rows.
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Choose file
            </Button>
            {rows.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClear} type="button">
                Clear
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {parseError && (
            <p className="text-sm text-destructive">{parseError}</p>
          )}

          {rows.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">Preview</span>
                <Badge variant="secondary" className="text-xs">
                  {rows.length} row{rows.length !== 1 ? "s" : ""}
                  {capped ? ` (capped at ${MAX_ROWS})` : ""}
                </Badge>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="pb-1 pr-2 font-medium">Title</th>
                      <th className="pb-1 pr-2 font-medium">Type</th>
                      <th className="pb-1 pr-2 font-medium">Priority</th>
                      <th className="pb-1 font-medium">Assignee Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((r, idx) => (
                      <tr key={idx} className="border-b border-border/50 last:border-0">
                        <td className="py-0.5 pr-2 truncate max-w-[140px]">{r.title}</td>
                        <td className="py-0.5 pr-2">{r.type ?? "—"}</td>
                        <td className="py-0.5 pr-2">{r.priority ?? "—"}</td>
                        <td className="py-0.5 truncate max-w-[120px]">{r.assigneeEmail ?? "—"}</td>
                      </tr>
                    ))}
                    {rows.length > 10 && (
                      <tr>
                        <td colSpan={4} className="py-0.5 text-muted-foreground">
                          …and {rows.length - 10} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} type="button">
            Cancel
          </Button>
          <LoadingButton
            isPending={importMutation.isPending}
            loadingText="Importing…"
            disabled={rows.length === 0}
            onClick={handleSubmit}
            type="button"
          >
            Import {rows.length > 0 ? `${rows.length} rows` : ""}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
