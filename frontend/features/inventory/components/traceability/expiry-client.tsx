"use client";

import { useState } from "react";
import Link from "next/link";
import { EyeIcon } from "@animateicons/react/lucide";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/shared";
import { EmptyReportIllustration } from "@/components/illustrations";
import { fadeUp } from "@/lib/motion-variants";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useExpiryItems } from "@/hooks/api/inventory/traceability";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

function ExpiryLotViewButton({ lotId, lotNumber }: { lotId: number; lotNumber: string }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
      <Link
        href={`/inventory/lots/${lotId}`}
        aria-label={`View lot ${lotNumber}`}
        {...hoverHandlers}
      >
        <EyeIcon ref={iconRef} size={14} />
      </Link>
    </Button>
  );
}

const DAY_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
] as const;

function getExpiryColorClass(daysUntilExpiry: number): string {
  if (daysUntilExpiry < 0) return "text-red-600 dark:text-red-400 font-semibold";
  if (daysUntilExpiry <= 30) return "text-amber-600 dark:text-amber-400 font-semibold";
  if (daysUntilExpiry <= 60) return "text-yellow-600 dark:text-yellow-400 font-medium";
  return "text-muted-foreground";
}

function formatDaysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d expired`;
  if (days === 0) return "Today";
  return `${days}d`;
}

type ExpiryItem = NonNullable<ReturnType<typeof useExpiryItems>["data"]>[number];

function getExpiryRowClassName(row: ExpiryItem): string {
  if (row.daysUntilExpiry < 0) return "bg-red-50/40 hover:bg-red-50/60 dark:bg-red-500/5 dark:hover:bg-red-500/10";
  if (row.daysUntilExpiry <= 30) return "bg-amber-50/30 hover:bg-amber-50/50 dark:bg-amber-500/5 dark:hover:bg-amber-500/10";
  return "";
}

const EXPIRY_COLUMNS: DataTableColumn<ExpiryItem>[] = [
  {
    key: "lotNumber",
    header: "Lot #",
    cell: (row) => (
      <span className="font-mono font-semibold text-foreground">{row.lotNumber}</span>
    ),
  },
  {
    key: "productName",
    header: "Product",
    className: "font-medium text-foreground truncate max-w-[160px]",
    cell: (row) => <>{row.productName}</>,
  },
  {
    key: "variantSku",
    header: "SKU",
    headerClassName: "hidden md:table-cell",
    className: "font-mono text-muted-foreground hidden md:table-cell",
    cell: (row) => <>{row.variantSku}</>,
  },
  {
    key: "expiryDate",
    header: "Expiry Date",
    className: "tabular-nums",
    cell: (row) => (
      <span className={getExpiryColorClass(row.daysUntilExpiry)}>
        {new Date(row.expiryDate).toLocaleDateString()}
      </span>
    ),
  },
  {
    key: "daysUntilExpiry",
    header: "Days",
    headerClassName: "text-right",
    className: "text-right tabular-nums",
    cell: (row) => (
      <span className={getExpiryColorClass(row.daysUntilExpiry)}>
        {formatDaysLabel(row.daysUntilExpiry)}
      </span>
    ),
  },
  {
    key: "currentStock",
    header: "Stock Qty",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => <>{row.currentStock.toLocaleString()}</>,
  },
  {
    key: "warehouseName",
    header: "Warehouse",
    headerClassName: "hidden md:table-cell",
    className: "text-muted-foreground hidden md:table-cell",
    cell: (row) => <>{row.warehouseName ?? "—"}</>,
  },
  {
    key: "actions",
    header: "",
    cell: (row) => <ExpiryLotViewButton lotId={row.lotId} lotNumber={row.lotNumber} />,
  },
];

export function ExpiryClient() {
  const [days, setDays] = useState("30");

  const { data, isLoading, isError, refetch } = useExpiryItems({ days: Number(days) });

  const items = data ?? [];

  function handleRetry(): void {
    void refetch();
  }

  function handleDaysChange(val: string): void {
    setDays(val);
  }

  const emptyState = (
    <motion.div variants={fadeUp} initial="hidden" animate="visible">
      <InventoryEmptyState
        illustration={<EmptyReportIllustration />}
        title={`No stock expiring within ${days} days`}
        description="All tracked lots are within acceptable expiry windows for this period."
        className="flex-1"
      />
    </motion.div>
  );

  return (
    <PageWrapper
      eyebrow="Operations · Inventory"
      title="Expiry Management"
      subtitle="Monitor stock approaching or past expiry dates."
      filters={
        <div className="flex w-full min-w-0 items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Expiring within</span>
          <Select value={days} onValueChange={handleDaysChange}>
            <SelectTrigger className="h-8 text-xs w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {isError ? (
        <ErrorState
          title="Failed to load expiry data"
          description="An error occurred while fetching expiry information. Please try again."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : (
        <DataTable
          data={items}
          columns={EXPIRY_COLUMNS}
          className="flex-1 min-h-0"
          getRowKey={(row) => row.lotId}
          isLoading={isLoading}
          emptyState={emptyState}
          rowClassName={getExpiryRowClassName}
        />
      )}
    </PageWrapper>
  );
}
