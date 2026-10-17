"use client";

import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { GenerateReportResult } from "@/hooks/api";

type IndexedRow = Record<string, unknown> & { _idx: number };

interface ResultTableProps {
  result: GenerateReportResult;
}

export function ResultTable({ result }: ResultTableProps) {
  const headers = useMemo(
    () =>
      result.fields.length > 0
        ? result.fields
        : result.rows[0]
          ? Object.keys(result.rows[0])
          : [],
    [result.fields, result.rows],
  );

  const indexedRows = useMemo<IndexedRow[]>(
    () => result.rows.slice(0, 100).map((row, i) => ({ ...row, _idx: i })),
    [result.rows],
  );

  const columns = useMemo<DataTableColumn<IndexedRow>[]>(
    () =>
      headers.map((h) => ({
        key: h,
        header: h,
        cell: (row) => (
          <span className="whitespace-nowrap">{String(row[h] ?? "")}</span>
        ),
        className: "text-xs",
        headerClassName: "text-xs whitespace-nowrap",
      })),
    [headers],
  );

  const footer =
    result.total > 100 ? (
      <span>Showing 100 of {result.total} rows — export to see all</span>
    ) : undefined;

  return (
    <div className="mt-4 max-h-[50dvh] overflow-auto">
      <DataTable
        data={indexedRows}
        columns={columns}
        getRowKey={(row) => row._idx}
        footer={footer}
        emptyState={
          <p className="text-sm text-muted-foreground text-center py-8">
            No data matches the selected filters
          </p>
        }
      />
    </div>
  );
}
