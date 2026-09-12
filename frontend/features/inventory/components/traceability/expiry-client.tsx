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
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { EmptyReportIllustration } from "@/components/illustrations";
import { useMotionVariants } from "@/lib/motion-variants";
import { formatCalendarDate } from "@/lib/date-utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { formatQuantity } from "@/features/inventory/components/planning/forecast-format";
import { useExpiryItems } from "@/hooks/api/inventory/traceability";
import { TruncatedText } from "@/components/ui/truncated-text";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";

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
  if (daysUntilExpiry < 0) return "text-status-danger-ink font-semibold";
  if (daysUntilExpiry <= 30) return "text-status-warning-ink font-semibold";
  if (daysUntilExpiry <= 60) return "text-status-warning-ink font-medium";
  return "text-muted-foreground";
}

function formatDaysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d expired`;
  if (days === 0) return "Today";
  return `${days}d`;
}

type ExpiryItem = NonNullable<ReturnType<typeof useExpiryItems>["data"]>[number];

function getExpiryRowClassName(row: ExpiryItem): string {
  if (row.daysUntilExpiry < 0) return "bg-status-danger-surface hover:bg-status-danger-surface";
  if (row.daysUntilExpiry <= 30) return "bg-status-warning-surface hover:bg-status-warning-surface";
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
    cell: (row) => <TruncatedText text={row.productName} className="font-medium text-foreground" />,
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
        {row.expiryDate ? formatCalendarDate(row.expiryDate) : "—"}
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
    key: "totalOnHand",
    header: "On Hand",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => <>{formatQuantity(row.totalOnHand)}</>,
  },
  {
    key: "actions",
    header: "",
    cell: (row) => <ExpiryLotViewButton lotId={row.id} lotNumber={row.lotNumber} />,
  },
];

export function ExpiryClient() {
  const canView = useCan("inventory:stock:read");
  const { fadeUp } = useMotionVariants();
  const [days, setDays] = useState("30");

  const { data, isLoading, isError, refetch } = useExpiryItems({ withinDays: Number(days) });

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

  // G8. Denied is not empty. Placed after every hook, not at the top of
  // the component: an early return above a useState or useQuery makes the
  // hook order depend on a permission, which React forbids and which only
  // shows up for the user who lacks the key.
  if (!canView) {
    return (
      <PageWrapper title="Expiry Management">
        <NoPermissionState permission="inventory:stock:read" className="flex-1" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Expiry Management"
      subtitle="Monitor stock approaching or past expiry dates."
      filters={
        <div className="flex w-full min-w-0 items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Expiring within</span>
          <Select value={days} onValueChange={handleDaysChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[110px]")}>
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
      <div className="flex flex-1 min-h-0 flex-col">
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
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            emptyState={emptyState}
            rowClassName={getExpiryRowClassName}
          />
        )}
      </div>
    </PageWrapper>
  );
}
