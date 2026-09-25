"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  IMPORTABLE_FIELDS,
  mapSourceColumns,
  type ColumnMapping,
  type ColumnMappingState,
} from "../import-column-mapping";
import type { ImportFormat } from "../import-export-contract";

interface ImportMappingSummaryProps {
  format: ImportFormat;
  content: string;
}

const STATE_LABEL: Record<ColumnMappingState, string> = {
  MAPPED: "Imported",
  IGNORED: "Ignored",
  UNKNOWN: "Not importable",
};

const STATE_VARIANT: Record<ColumnMappingState, "secondary" | "outline" | "destructive"> = {
  MAPPED: "secondary",
  IGNORED: "outline",
  UNKNOWN: "destructive",
};

function MappingRow({ mapping }: { mapping: ColumnMapping }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{mapping.column}</TableCell>
      <TableCell className="text-muted-foreground">{mapping.field ?? "—"}</TableCell>
      <TableCell className="text-right">
        <Badge variant={STATE_VARIANT[mapping.state]}>{STATE_LABEL[mapping.state]}</Badge>
      </TableCell>
    </TableRow>
  );
}

export function ImportMappingSummary({ format, content }: ImportMappingSummaryProps) {
  const mappings = useMemo(() => mapSourceColumns(format, content), [format, content]);
  const missingTitle = useMemo(
    () => !mappings.some((mapping) => mapping.field === "title"),
    [mappings],
  );

  function renderMapping(mapping: ColumnMapping) {
    return <MappingRow key={mapping.column} mapping={mapping} />;
  }

  if (mappings.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No columns could be read from this file. A CSV needs a header row; JSON needs an
        array of objects. Importable fields: {IMPORTABLE_FIELDS.join(", ")}.
      </p>
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">Column mapping</h3>
        <p className="text-sm text-muted-foreground">
          Columns are matched to ticket fields by name, ignoring case. Nothing has been sent
          yet.
        </p>
      </div>
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File column</TableHead>
              <TableHead>Ticket field</TableHead>
              <TableHead className="text-right">Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{mappings.map(renderMapping)}</TableBody>
        </Table>
      </div>
      {missingTitle ? (
        <p className="text-sm text-status-danger-ink-strong">
          No column maps to <span className="font-mono">title</span>, which every ticket
          needs. Every row will be rejected.
        </p>
      ) : null}
    </div>
  );
}
