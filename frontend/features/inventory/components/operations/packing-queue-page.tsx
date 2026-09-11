"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PackageOpenIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { EmptyOrdersIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { PackingStationSheet } from "@/features/inventory/components/operations/packing-station-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { statusToneClasses, typeScaleClass } from "@/lib/design-tokens";
import { useCan } from "@/hooks/api/access";
import { usePackingQueue, type PackingQueueRow } from "@/hooks/api/inventory/packing";
import { formatShortDate } from "@/lib/date-utils";

const PACKING_PERMISSION = "inventory:packages:manage";
const PAGE_SIZE = 25;

function unitsOf(value: string): number {
  return Number(value);
}

function ProgressBadge({ row }: { row: PackingQueueRow }) {
  const packed = unitsOf(row.packedQuantity);
  const tone = row.fullyPacked ? "success" : packed > 0 ? "warning" : "neutral";
  const label = row.fullyPacked ? "Ready to close" : packed > 0 ? "Part packed" : "Not started";
  const classes = statusToneClasses(tone);
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 px-2 py-0.5",
        typeScaleClass("micro"),
        classes.surface,
        classes.ink,
        classes.rule,
      )}
    >
      {label}
    </Badge>
  );
}

/**
 * B6 — the packing queue, read off the cartons.
 *
 * It used to render sales orders whose status happened to be PICKED. That drops
 * an order the moment somebody starts packing it — so the half-packed order with
 * an open carton on the bench disappeared from the screen of the person packing
 * it — and it showed orders whose goods were still on the shelf as ready to go.
 * The queue now comes from picked quantities and the cartons standing against
 * them, which is what the bench actually needs to know.
 */
export function PackingQueuePage() {
  const canPack = useCan(PACKING_PERMISSION);
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [activeRow, setActiveRow] = useState<PackingQueueRow | null>(null);

  const query = usePackingQueue({ page, limit: PAGE_SIZE });

  const allRows = useMemo(() => query.data?.items ?? [], [query.data]);
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allRows;
    return allRows.filter(
      (row) =>
        row.soNumber.toLowerCase().includes(term) ||
        (row.customerName ?? "").toLowerCase().includes(term),
    );
  }, [allRows, search]);

  const totals = useMemo(
    () =>
      allRows.reduce(
        (acc, row) => ({
          picked: acc.picked + unitsOf(row.pickedQuantity),
          packed: acc.packed + unitsOf(row.packedQuantity),
          ready: acc.ready + (row.fullyPacked ? 1 : 0),
        }),
        { picked: 0, packed: 0, ready: 0 },
      ),
    [allRows],
  );

  function handleSearchChange(value: string): void {
    setSearch(value);
    setPage(1);
  }

  function handlePageChange(next: number): void {
    setPage(next);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  function handleStationClose(open: boolean): void {
    if (!open) setActiveRow(null);
  }

  const columns: DataTableColumn<PackingQueueRow>[] = [
    {
      key: "soNumber",
      header: "SO #",
      cell: (row) => (
        <Link
          href={`/inventory/sales-orders/${row.soId}`}
          className={cn("font-mono text-primary transition-colors hover:underline", typeScaleClass("dense"))}
        >
          {row.soNumber}
        </Link>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      cell: (row) => <TruncatedText text={row.customerName ?? "—"} className="text-sm" />,
    },
    {
      key: "orderDate",
      header: "Order date",
      cell: (row) => (
        <span className="font-mono tabular-nums">{formatShortDate(row.orderDate)}</span>
      ),
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      key: "picked",
      header: "Picked",
      cell: (row) => (
        <span className="font-mono tabular-nums">{unitsOf(row.pickedQuantity)}</span>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "packed",
      header: "Packed",
      cell: (row) => (
        <span className="font-mono tabular-nums">{unitsOf(row.packedQuantity)}</span>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "cartons",
      header: "Cartons",
      cell: (row) => (
        <span className="font-mono tabular-nums">{row.packageCount}</span>
      ),
      className: "text-right hidden sm:table-cell",
      headerClassName: "text-right hidden sm:table-cell",
    },
    {
      key: "progress",
      header: "Progress",
      cell: (row) => <ProgressBadge row={row} />,
    },
    {
      key: "actions",
      header: "",
      cell: (row) => <PackRowAction row={row} onOpen={setActiveRow} />,
      className: "w-8",
      headerClassName: "w-8",
    },
  ];

  if (!canPack) {
    return (
      <PageWrapper title="Packing Queue">
        <NoPermissionState
          permission={PACKING_PERMISSION}
          description="You need package management access to work the packing bench."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Packing Queue"
      subtitle={`${query.data?.total ?? 0} orders with goods in totes`}
      filters={
        <SearchInput
          className="min-w-0 flex-1 lg:max-w-md"
          value={search}
          onValueChange={handleSearchChange}
          placeholder="Search SO # or customer…"
        />
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <StatCardGrid cols={3} className="mb-2 shrink-0">
          <StatCard label="Orders in queue" value={query.data?.total ?? 0} tone="amber" isLoading={query.isLoading} />
          <StatCard label="Units picked" value={totals.picked} tone="blue" isLoading={query.isLoading} />
          <StatCard label="Ready to close" value={totals.ready} tone="emerald" isLoading={query.isLoading} />
        </StatCardGrid>

        {query.error ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load the packing queue"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            className="min-h-0 flex-1"
            getRowKey={(row) => row.soId}
            isLoading={query.isLoading}
            minWidth="880px"
            pagination={{
              mode: "server",
              page,
              pageSize: PAGE_SIZE,
              total: query.data?.total ?? 0,
              onPageChange: handlePageChange,
            }}
            emptyState={
              <InventoryEmptyState
                illustration={search.trim() ? <EmptySearchIllustration /> : <EmptyOrdersIllustration />}
                title={search.trim() ? "No orders match your search" : "Nothing to pack"}
                description={
                  search.trim()
                    ? "Try a different search term."
                    : "Orders appear here once a picker has their goods in a tote."
                }
                compact
              />
            }
          />
        )}
      </div>

      <PackingStationSheet
        open={activeRow !== null}
        onOpenChange={handleStationClose}
        row={activeRow}
      />
    </PageWrapper>
  );
}

interface PackRowActionProps {
  row: PackingQueueRow;
  onOpen: (row: PackingQueueRow) => void;
}

/**
 * Extracted because a DataTable cell is a callback, and `useAnimatedIcon` cannot
 * run inside one.
 */
function PackRowAction({ row, onOpen }: PackRowActionProps) {
  function handleClick(): void {
    onOpen(row);
  }
  return (
    <AnimatedIconButton
      icon={PackageOpenIcon}
      iconSize={14}
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      aria-label={`Pack ${row.soNumber}`}
      onClick={handleClick}
    />
  );
}
