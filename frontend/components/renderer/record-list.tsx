"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import {
  DataTable,
  type DataTableColumn,
  type DataTableProps,
} from "@/components/ui/data-table";
import {
  isNumericField,
  moneyDisplayFor,
  type RecordLayout,
} from "@/lib/renderer/layout";
import { cn } from "@/lib/utils";
import {
  formatFieldText,
  renderFieldValue,
  resolveField,
  type RecordValue,
} from "./format-value";
import { densityAttribute, type DensityMode } from "@/lib/design-tokens";
import { DEFAULT_MONEY_DISPLAY, type MoneyDisplay } from "@/lib/format-utils";
import { useShellVariant } from "@/components/layout/shell-variant-context";

const MOBILE_SYNC_LIMIT = 20;

type BorrowedProps<T extends RecordValue = RecordValue> = Pick<
  DataTableProps<T>,
  | "isLoading"
  | "emptyState"
  | "pagination"
  | "onRowClick"
  | "minWidth"
  | "className"
    Selection is borrowed rather than described. Which rows a person may pick,
    and what picking them does, depends on the caller's permissions and on the
    action being staged — a screen concern, like the row actions beside it. The
    table already owns the checkbox column and select-all; forwarding is what
    stops every list growing its own.
  | "selection"
    A load-more control under the rows. Borrowed rather than described for the
    same reason selection is: whether there is another page to fetch is a fact
    about the caller's query, not about the shape of the record. Two nurture
    lists page by cursor and had nowhere to put the control, which is the only
    reason a keyset list could not be described.
  | "footer"
>;

export interface RecordListProps<T extends RecordValue = RecordValue> extends BorrowedProps<T> {
  layout: RecordLayout;
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  actions?: (row: T) => ReactNode;
  leading?: (row: T) => ReactNode;
  density?: DensityMode;
  money?: MoneyDisplay;
  cells?: Record<string, (row: T) => ReactNode>;
}

interface MobileRecordCardProps<T extends RecordValue> {
  row: T;
  layout: RecordLayout;
  money: MoneyDisplay;
  leading: ((row: T) => ReactNode) | undefined;
  actions: ((row: T) => ReactNode) | undefined;
  onRowClick: ((row: T) => void) | undefined;
  cells: Record<string, (row: T) => ReactNode> | undefined;
}

function MobileRecordCard<T extends RecordValue>({
  row,
  layout,
  money,
  leading,
  actions,
  onRowClick,
  cells,
}: MobileRecordCardProps<T>) {
  const primary =
    layout.list.columns.find((c) => c.primary) ?? layout.list.columns[0];
  const primaryField = resolveField(
    layout,
    primary?.field ?? layout.titleField,
  );

  const handleClick = useCallback(() => onRowClick?.(row), [onRowClick, row]);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onRowClick?.(row);
      }
    },
    [onRowClick, row],
  );

  return (
    <div
      role={onRowClick ? "button" : undefined}
      tabIndex={onRowClick ? 0 : undefined}
      onClick={onRowClick ? handleClick : undefined}
      onKeyDown={onRowClick ? handleKeyDown : undefined}
      className={cn(
        "rounded-lg border border-border bg-card text-left touch-manipulation",
        onRowClick &&
          "cursor-pointer active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="flex min-h-11 min-w-0 items-start gap-gap-field p-card-pad">
        {leading ? (
          <span className="shrink-0 pt-0.5">{leading(row)}</span>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-gap-inline">
          <span className="truncate text-sm font-medium">
            {cells?.[primaryField.name]
              ? cells[primaryField.name](row)
              : renderFieldValue(
                  primaryField,
                  row[primaryField.name],
                  moneyDisplayFor(primaryField, row, money),
                  row,
                )}
          </span>
          <span className="flex flex-wrap items-center gap-gap-field">
            {layout.list.columns
              .filter((column) => column.field !== primaryField.name)
              .map((column) => {
                const drawn = cells?.[column.field];
                if (drawn)
                  return (
                    <span key={column.field} className="text-dense text-muted-foreground">
                      {drawn(row)}
                    </span>
                  );

                const field = resolveField(layout, column.field);
                const display = moneyDisplayFor(field, row, money);
                const text = formatFieldText(field, row[column.field], display);
                if (!text) return null;
                return (
                  <span
                    key={column.field}
                    className="text-dense text-muted-foreground"
                  >
                    {renderFieldValue(field, row[column.field], display, row)}
                  </span>
                );
              })}
          </span>
        </div>
        {actions ? <span className="shrink-0">{actions(row)}</span> : null}
      </div>
    </div>
  );
}

export function RecordList<T extends RecordValue = RecordValue>({
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
  footer,
  minWidth,
  className,
  density = "comfortable",
  money = DEFAULT_MONEY_DISPLAY,
  cells,
}: RecordListProps<T>) {
  const shellVariant = useShellVariant();
  const columns = useMemo<DataTableColumn<T>[]>(
    () =>
      layout.list.columns.map((column) => {
        const field = resolveField(layout, column.field);
        const numeric = isNumericField(field);

        return {
          key: column.field,
          header: field.label,
          className: cn(
            numeric && "text-right font-mono tabular-nums",
            column.width,
          ),
          headerClassName: numeric ? "text-right" : undefined,
          cell: (row) => {
            const display = moneyDisplayFor(field, row, money);
            const drawn = cells?.[column.field];
            const value = drawn
              ? drawn(row)
              : renderFieldValue(field, row[column.field], display, row);
            if (!column.subtitle) return value;

            const subtitle = resolveField(layout, column.subtitle);
            const subtitleText = formatFieldText(
              subtitle,
              row[column.subtitle],
              moneyDisplayFor(subtitle, row, money),
            );

            return (
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium text-foreground">
                  {value}
                </span>
                {subtitleText ? (
                  <span
                    className="truncate text-dense text-muted-foreground"
                    title={subtitleText}
                  >
                    {subtitleText}
                  </span>
                ) : null}
              </div>
            );
          },
        };
      }),
    [layout, money, cells],
  );

  const allColumns = useMemo<DataTableColumn<T>[]>(() => {
    const withLeading = leading
      ? [
          { key: "leading", header: "", className: "w-10", cell: leading },
          ...columns,
        ]
      : columns;

    return actions
      ? [
          ...withLeading,
          { key: "actions", header: "", className: "w-10", cell: actions },
        ]
      : withLeading;
  }, [columns, actions, leading]);

  const primary =
    layout.list.columns.find((column) => column.primary) ??
    layout.list.columns[0];

  const mobileCard = (row: T): ReactNode => {
    const primaryField = resolveField(
      layout,
      primary?.field ?? layout.titleField,
    );

    return (
      <div className="flex min-h-11 min-w-0 items-start gap-gap-field p-card-pad">
        {leading ? (
          <span className="shrink-0 pt-0.5">{leading(row)}</span>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col gap-gap-inline">
          <span className="truncate text-sm font-medium">
            {cells?.[primaryField.name]
              ? cells[primaryField.name](row)
              : renderFieldValue(
                  primaryField,
                  row[primaryField.name],
                  moneyDisplayFor(primaryField, row, money),
                  row,
                )}
          </span>
          <span className="flex flex-wrap items-center gap-gap-field">
            {layout.list.columns
              .filter((column) => column.field !== primaryField.name)
              .map((column) => {
                const drawn = cells?.[column.field];
                if (drawn)
                  return (
                    <span key={column.field} className="text-dense text-muted-foreground">
                      {drawn(row)}
                    </span>
                  );

                const field = resolveField(layout, column.field);
                const display = moneyDisplayFor(field, row, money);
                const text = formatFieldText(field, row[column.field], display);
                if (!text) return null;
                return (
                  <span
                    key={column.field}
                    className="text-dense text-muted-foreground"
                  >
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
    const visible = rows.slice(0, MOBILE_SYNC_LIMIT);
    return (
      <div
        {...densityAttribute(density)}
        className={cn("flex min-w-0 flex-col gap-2 p-2", className)}
      >
        {visible.map((row, index) => (
          <MobileRecordCard<T>
            key={getRowKey(row, index)}
            row={row}
            layout={layout}
            money={money}
            leading={leading}
            actions={actions}
            onRowClick={onRowClick}
            cells={cells}
          />
        ))}
        {footer}
      </div>
    );
  }

  return (
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
        footer={footer}
        minWidth={minWidth}
        mobileCard={mobileCard}
        className={className}
        rowClassName={() => "h-row-h"}
      />
    </div>
  );
}
