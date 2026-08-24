"use client";

import { useMemo, type ReactNode } from "react";
import { DataTable, type DataTableColumn, type DataTableProps } from "@/components/ui/data-table";
import { isNumericField, type RecordLayout } from "@/lib/renderer/layout";
import { cn } from "@/lib/utils";
import { formatFieldText, renderFieldValue, resolveField, type RecordValue } from "./format-value";
import { densityAttribute, type DensityMode } from "@/lib/design-tokens";

type BorrowedProps = Pick<
  DataTableProps<RecordValue>,
  "isLoading" | "emptyState" | "pagination" | "onRowClick" | "minWidth" | "className"
>;

export interface RecordListProps extends BorrowedProps {
  layout: RecordLayout;
  rows: RecordValue[];
  getRowKey: (row: RecordValue, index: number) => string;
  /**
   * A trailing column for per-row controls. Not part of the description because
   * what a row can do depends on the caller's permissions, which is a screen
   * concern rather than a shape one.
   */
  actions?: (row: RecordValue) => ReactNode;
  /**
   * Set by the surface so the toggle can live in its toolbar. Omitted, the list
   * renders comfortable and shows no control — a screen with no room for one
   * should not grow a floating button.
   */
  density?: DensityMode;
}

/**
 * Turns a layout description into the columns `DataTable` already knows how to
 * render.
 *
 * Deliberately not a second table. The platform has exactly one, and it already
 * owns density, sticky headers, pagination and the card fallback below the
 * breakpoint; a parallel implementation would fork all of that and drift. What
 * the engine contributes is that the columns, their labels, their alignment and
 * the mobile card are all derived from the description instead of being written
 * out per screen — which is what lets a tenant's own arrangement drive them
 * later.
 */
export function RecordList({
  layout,
  rows,
  getRowKey,
  actions,
  isLoading,
  emptyState,
  pagination,
  onRowClick,
  minWidth,
  className,
  density = "comfortable",
}: RecordListProps) {
  const columns = useMemo<DataTableColumn<RecordValue>[]>(
    () =>
      layout.list.columns.map((column) => {
        const field = resolveField(layout, column.field);
        const numeric = isNumericField(field);

        return {
          key: column.field,
          header: field.label,
          sortable: column.sortable,
          // Sorting compares the underlying value, never the formatted string:
          // a localised date sorts alphabetically and lands in the wrong order.
          sortValue: column.sortable
            ? (row) => {
                const value = row[column.field];
                return typeof value === "number" ? value : String(value ?? "");
              }
            : undefined,
          className: cn(numeric && "text-right font-mono tabular-nums", column.width),
          headerClassName: numeric ? "text-right" : undefined,
          cell: (row) => {
            const value = renderFieldValue(field, row[column.field]);
            if (!column.subtitle) return value;

            const subtitle = resolveField(layout, column.subtitle);
            const subtitleText = formatFieldText(subtitle, row[column.subtitle]);

            return (
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium text-foreground">{value}</span>
                {subtitleText ? (
                  <span className="truncate text-dense text-muted-foreground" title={subtitleText}>
                    {subtitleText}
                  </span>
                ) : null}
              </div>
            );
          },
        };
      }),
    [layout],
  );

  const allColumns = useMemo<DataTableColumn<RecordValue>[]>(
    () =>
      actions
        ? [...columns, { key: "actions", header: "", className: "w-10", cell: actions }]
        : columns,
    [columns, actions],
  );

  const primary = layout.list.columns.find((column) => column.primary) ?? layout.list.columns[0];

  const mobileCard = (row: RecordValue): ReactNode => {
    const primaryField = resolveField(layout, primary?.field ?? layout.titleField);

    return (
      <div className="flex min-h-11 min-w-0 flex-col gap-gap-inline p-card-pad">
        <span className="truncate text-sm font-medium">
          {renderFieldValue(primaryField, row[primaryField.name])}
        </span>
        <span className="flex flex-wrap items-center gap-gap-field">
          {layout.list.columns
            .filter((column) => column.field !== primaryField.name)
            .map((column) => {
              const field = resolveField(layout, column.field);
              const text = formatFieldText(field, row[column.field]);
              if (!text) return null;
              return (
                <span key={column.field} className="text-dense text-muted-foreground">
                  {renderFieldValue(field, row[column.field])}
                </span>
              );
            })}
        </span>
      </div>
    );
  };

  return (
    /*
      `data-density` sits on a wrapper rather than on <html>, so one pipeline
      list can be dense while the rest of the product is not. The tokens are
      declared for any element carrying the attribute, and cascade to this
      subtree only.
    */
    <div {...densityAttribute(density)} className="flex min-w-0 flex-col">
      <DataTable
        data={rows}
        columns={allColumns}
        getRowKey={getRowKey}
        isLoading={isLoading}
        emptyState={emptyState}
        pagination={pagination}
        onRowClick={onRowClick}
        minWidth={minWidth}
        mobileCard={mobileCard}
        className={className}
        /*
          The row height comes from the density token rather than from the
          table's own padding, which is what makes the toggle do anything at
          all. `h-row-h` resolves to 3rem comfortable and 2.5rem compact.
        */
        rowClassName={() => "h-row-h"}
      />
    </div>
  );
}
