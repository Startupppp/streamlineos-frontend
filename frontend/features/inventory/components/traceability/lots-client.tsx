"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import Link from "next/link";
import { EyeIcon } from "@animateicons/react/lucide";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/shared";
import {
  EmptyTransferIllustration,
  EmptySearchIllustration,
} from "@/components/illustrations";
import { useMotionVariants } from "@/lib/motion-variants";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useLots } from "@/hooks/api/inventory/traceability";
import {
  LOT_STATUS_BADGE,
  LOT_STATUS_LABEL,
  type LotStatus,
} from "@/features/inventory/lib";
import { TruncatedText } from "@/components/ui/truncated-text";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";

function LotViewButton({ id, lotNumber }: { id: number; lotNumber: string }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
      <Link
        href={`/inventory/lots/${id}`}
        aria-label={`View lot ${lotNumber}`}
        {...hoverHandlers}
      >
        <EyeIcon ref={iconRef} size={14} />
      </Link>
    </Button>
  );
}

function getExpiryClass(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = (new Date(dateStr).getTime() - Date.now()) / 86400000;
  if (diff < 0) return "text-status-danger-ink font-medium";
  if (diff <= 30) return "text-status-warning-ink font-medium";
  return "text-muted-foreground";
}

const LOT_STATUSES: LotStatus[] = ["ACTIVE", "EXPIRED", "BLOCKED", "CONSUMED", "RECALLED"];

type LotItem = NonNullable<ReturnType<typeof useLots>["data"]>["items"][number];

const LOTS_COLUMNS: DataTableColumn<LotItem>[] = [
  {
    key: "lotNumber",
    header: "Lot #",
    cell: (row) => (
      <span className="font-mono font-semibold text-foreground">{row.lotNumber}</span>
    ),
  },
  {
    key: "product",
    header: "Product / SKU",
    cell: (row) => (
      <>
        <TruncatedText text={row.productName} className="font-medium text-foreground" />
        <span className="text-muted-foreground font-mono text-micro">{row.variantSku}</span>
      </>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge
        variant="outline"
        className={`text-micro px-1.5 ${LOT_STATUS_BADGE[row.status]}`}
      >
        {LOT_STATUS_LABEL[row.status]}
      </Badge>
    ),
  },
  {
    key: "currentStock",
    header: "Stock",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => <>{row.currentStock.toLocaleString()}</>,
  },
  {
    key: "expiryDate",
    header: "Expiry Date",
    className: "tabular-nums",
    cell: (row) => (
      <span className={getExpiryClass(row.expiryDate)}>
        {row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : "—"}
      </span>
    ),
  },
  {
    key: "warehouseName",
    header: "Warehouse",
    headerClassName: "hidden md:table-cell",
    className: "text-muted-foreground hidden md:table-cell",
    cell: (row) => <TruncatedText text={row.warehouseName ?? "—"} className="text-muted-foreground" />,
  },
  {
    key: "createdAt",
    header: "Created",
    headerClassName: "hidden lg:table-cell",
    className: "text-muted-foreground tabular-nums hidden lg:table-cell",
    cell: (row) => <>{new Date(row.createdAt).toLocaleDateString()}</>,
  },
  {
    key: "actions",
    header: "",
    cell: (row) => <LotViewButton id={row.id} lotNumber={row.lotNumber} />,
  },
];

export function LotsClient() {
  const { fadeUp } = useMotionVariants();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [expiringWithinDays, setExpiringWithinDays] = useState("ALL");

  const { data, isLoading, isError, refetch } = useLots({
    page,
    limit: 20,
    status: status !== "ALL" ? status : undefined,
    search: debouncedSearch.trim() || undefined,
    expiringWithinDays: expiringWithinDays !== "ALL" ? Number(expiringWithinDays) : undefined,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasFilters = status !== "ALL" || search !== "" || expiringWithinDays !== "ALL";

  function handleRetry(): void {
    void refetch();
  }

  function handleSearchChange(value: string): void {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(val: string): void {
    setStatus(val);
    setPage(1);
  }

  function handleExpiryFilterChange(val: string): void {
    setExpiringWithinDays(val);
    setPage(1);
  }

  function handleClearFilters(): void {
    setSearch("");
    setStatus("ALL");
    setExpiringWithinDays("ALL");
    setPage(1);
  }

  const emptyState = (
    <motion.div variants={fadeUp} initial="hidden" animate="visible">
      <InventoryEmptyState
        illustration={<EmptyTransferIllustration />}
        title="No lots found"
        description={hasFilters ? undefined : "Lots will appear here once items are received with lot tracking enabled."}
        filtersActive={hasFilters}
        onClearFilters={handleClearFilters}
        className="flex-1"
      />
    </motion.div>
  );

  return (
    <PageWrapper
      title="Lots"
      subtitle="Track lot numbers, expiry dates, and stock by lot."
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <SearchInput className="min-w-0 flex-1"
            placeholder="Search lot or product…"
            value={search}
            onValueChange={handleSearchChange}
          />
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[140px]")}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {LOT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {LOT_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={expiringWithinDays} onValueChange={handleExpiryFilterChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[170px]")}>
              <SelectValue placeholder="Expiring within" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any expiry</SelectItem>
              <SelectItem value="7">Expiring in 7 days</SelectItem>
              <SelectItem value="30">Expiring in 30 days</SelectItem>
              <SelectItem value="60">Expiring in 60 days</SelectItem>
              <SelectItem value="90">Expiring in 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {isError ? (
          <ErrorState
            title="Failed to load lots"
            description="An error occurred while fetching lot data. Please try again."
            onRetry={handleRetry}
            className="flex-1"
          />
        ) : (
          <DataTable
            data={items}
            columns={LOTS_COLUMNS}
            className="flex-1 min-h-0"
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            emptyState={emptyState}
            pagination={{
              mode: "server",
              page,
              pageSize: 20,
              total,
              onPageChange: setPage,
            }}
          />
        )}
      </div>
    </PageWrapper>
  );
}
