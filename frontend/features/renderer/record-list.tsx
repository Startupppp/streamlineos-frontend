"use client";

import { useMemo, type ReactNode } from "react";
import { DataTable, type DataTableColumn, type DataTableProps } from "@/components/ui/data-table";
import { isNumericField, moneyDisplayFor, type RecordLayout } from "@/lib/renderer/layout";
import { cn } from "@/lib/utils";
import { formatFieldText, renderFieldValue, resolveField, type RecordValue } from "./format-value";
import { densityAttribute, type DensityMode } from "@/lib/design-tokens";
import { DEFAULT_MONEY_DISPLAY, type MoneyDisplay } from "@/lib/format-utils";
import { useShellVariant } from "@/components/layout/shell-variant-context";

type BorrowedProps = Pick<
  DataTableProps<RecordValue>,
  | "isLoading"
  | "emptyState"
  | "pagination"
  | "onRowClick"
  | "minWidth"
  | "className"
  /*
    Selection is borrowed rather than described. Which rows a person may pick,
    and what picking them does, depends on the caller's permissions and on the
    action being staged — a screen concern, like the row actions beside it. The
    table already owns the checkbox column and select-all; forwarding is what
    stops every list growing its own.
  */
  | "selection"
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
   * A leading column for the one control a row is *about*.
   *
   * Symmetric with `actions` and separate from `selection` on purpose. Selection
   * stages a bulk action and brings a select-all header with it; this is a
   * per-row control that changes the record on the spot — ticking a task done is
   * the example it exists for, and putting that on the right of the row, behind
   * a menu, is putting the point of the screen last.
   *
   * Not part of the description, for the same reason `actions` is not: what a
   * row can do depends on the caller's permissions.
   */
  leading?: (row: RecordValue) => ReactNode;
  /**
   * Set by the surface so the toggle can live in its toolbar. Omitted, the list
   * renders comfortable and shows no control — a screen with no room for one
   * should not grow a floating button.
   */
  density?: DensityMode;
  /**
   * The tenant's currency, for `money` fields.
   *
   * Passed in rather than read from `useOrgDisplay` inside the engine, and
   * deliberately: the renderer takes its input as data — a layout and rows — and
   * a hook here would make every consumer, including a test of the engine
   * itself, require a QueryClientProvider to render a table. Surfaces read the
   * hook once and hand the value down, the same way they hand down the layout.
   */
  money?: MoneyDisplay;
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
  leading,
  isLoading,
  emptyState,
  pagination,
  onRowClick,
  selection,
  minWidth,
  className,
  density = "comfortable",
  money = DEFAULT_MONEY_DISPLAY,
}: RecordListProps) {
  const shellVariant = useShellVariant();
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
            const display = moneyDisplayFor(field, row, money);
            const value = renderFieldValue(field, row[column.field], display, row);
            if (!column.subtitle) return value;

            const subtitle = resolveField(layout, column.subtitle);
            const subtitleText = formatFieldText(
              subtitle,
              row[column.subtitle],
              moneyDisplayFor(subtitle, row, money),
            );

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
    [layout, money],
  );

  const allColumns = useMemo<DataTableColumn<RecordValue>[]>(
    () => {
      const withLeading = leading
        ? [
            { key: "leading", header: "", className: "w-10", cell: leading },
            ...columns,
          ]
        : columns;

      return actions
        ? [...withLeading, { key: "actions", header: "", className: "w-10", cell: actions }]
        : withLeading;
    },
    [columns, actions, leading],
  );

  const primary = layout.list.columns.find((column) => column.primary) ?? layout.list.columns[0];

  const mobileCard = (row: RecordValue): ReactNode => {
    const primaryField = resolveField(layout, primary?.field ?? layout.titleField);

    /*
      The row's controls come to the phone too.

      They did not, at first, and that was a defect rather than a decision: below
      the breakpoint the table is replaced by these cards, so a list whose card
      dropped `leading` and `actions` left a task that could not be ticked done
      and a row that could not be opened — on the device where ticking something
      done is most of what anybody wants. Principle 5 names those jobs
      explicitly. What the card still drops is columns, not capability.
    */
    return (
      <div className="flex min-h-11 min-w-0 items-start gap-gap-field p-card-pad">
        {leading ? <span className="shrink-0 pt-0.5">{leading(row)}</span> : null}

        <div className="flex min-w-0 flex-1 flex-col gap-gap-inline">
          <span className="truncate text-sm font-medium">
            {renderFieldValue(primaryField, row[primaryField.name], moneyDisplayFor(primaryField, row, money), row)}
          </span>
          <span className="flex flex-wrap items-center gap-gap-field">
            {layout.list.columns
              .filter((column) => column.field !== primaryField.name)
              .map((column) => {
                const field = resolveField(layout, column.field);
                const display = moneyDisplayFor(field, row, money);
                const text = formatFieldText(field, row[column.field], display);
                if (!text) return null;
                return (
                  <span key={column.field} className="text-dense text-muted-foreground">
                    {renderFieldValue(field, row[column.field], display, row)}
                  </span>
                );
              })}
          </span>
        </div>

        {actions ? <span className="shrink-0">{actions(row)}</span> : null}
      </div>
    );
  };

  if (shellVariant === "mobile") {
    return (
      <div
        {...densityAttribute(density)}
        className={cn("flex min-w-0 flex-col gap-2 p-2", className)}
      >
        {rows.map((row, index) => (
          <div
            key={getRowKey(row, index)}
            role={onRowClick ? "button" : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            onKeyDown={
              onRowClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  }
                : undefined
            }
            className={cn(
              "rounded-lg border border-border bg-card text-left touch-manipulation",
              onRowClick &&
                "cursor-pointer active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {mobileCard(row)}
          </div>
        ))}
      </div>
    );
  }

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
        selection={selection}
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
