"use client";

import { useCallback, useMemo } from "react";
import { AppSheet, ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSegmentMembers } from "@/hooks/api/crm/segments";
import type { ReportingCompiledColumn } from "@/types/crm/reporting";
import {
  SEGMENT_MEMBER_PREVIEW_MAX,
  type SegmentSource,
  type SegmentSummary,
} from "@/types/crm/segments";


interface SegmentMembersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment: SegmentSummary | null;
  sources: readonly SegmentSource[];
}

function labelFor(
  column: ReportingCompiledColumn,
  labelOf: (field: string) => string,
): string {
  if (column.projection.kind === "field") return labelOf(column.projection.field);
  return column.projection.field
    ? `${column.projection.aggregate} of ${labelOf(column.projection.field)}`
    : column.projection.aggregate;
}

function renderCell(value: unknown, type: ReportingCompiledColumn["type"]): string {
  if (value === null || value === undefined) return "—";
  if (type === "timestamp" || type === "date") return formatShortDate(String(value));
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function SegmentMembersSheet({
  open,
  onOpenChange,
  segment,
  sources,
}: SegmentMembersSheetProps) {
  const segmentId = open && segment ? segment.segmentId : null;
  const { data, isLoading, isError, error, refetch, access } = useSegmentMembers(
    segmentId,
    SEGMENT_MEMBER_PREVIEW_MAX,
  );

  const labelOf = useMemo(() => {
    const catalogue = sources.find((candidate) => candidate.key === segment?.sourceKey);
    return (field: string) =>
      catalogue?.fields.find((entry) => entry.name === field)?.label ?? field;
  }, [sources, segment?.sourceKey]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const description =
    data === undefined
      ? "Evaluated when you open this."
      : data.truncated
        ? `${data.total} records match. Showing the first ${data.rows.length}.`
        : `${data.total} ${data.total === 1 ? "record matches" : "records match"}.`;

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={segment?.name ?? "Segment"}
      description={description}
      className="sm:max-w-2xl"
    >
      {!access.allowed ? (
        <p className="text-sm text-muted-foreground">
          You do not have access to the records behind this segment.
        </p>
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Couldn't evaluate this segment"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState
          title="Nothing matches right now"
          description="The criteria are valid — no record satisfies them today. A segment is re-evaluated on every read, so this will fill in as records change."
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {data.columns.map((column) => (
                  <TableHead key={column.alias}>{labelFor(column, labelOf)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row, index) => (
                <TableRow key={`${String(row[data.columns[0]?.alias ?? ""])}-${index}`}>
                  {data.columns.map((column) => (
                    <TableCell key={column.alias} className="whitespace-nowrap">
                      {renderCell(row[column.alias], column.type)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppSheet>
  );
}
