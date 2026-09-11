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
import { ErrorState, NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { EmptyProductsIllustration } from "@/components/illustrations";
import { useMotionVariants } from "@/lib/motion-variants";
import { formatShortDate } from "@/lib/date-utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useSerials } from "@/hooks/api/inventory/traceability";
import {
  SERIAL_STATUS_BADGE,
  SERIAL_STATUS_LABEL,
  type SerialStatus,
} from "@/features/inventory/lib";
import { TruncatedText } from "@/components/ui/truncated-text";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";

function SerialViewButton({ id, serialNumber }: { id: number; serialNumber: string }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
      <Link
        href={`/inventory/serials/${id}`}
        aria-label={`View serial ${serialNumber}`}
        {...hoverHandlers}
      >
        <EyeIcon ref={iconRef} size={14} />
      </Link>
    </Button>
  );
}

const SERIAL_STATUSES: SerialStatus[] = [
  "IN_STOCK",
  "RESERVED",
  "SHIPPED",
  "RETURNED",
  "SCRAPPED",
  "QUARANTINE",
];

type SerialItem = NonNullable<ReturnType<typeof useSerials>["data"]>["items"][number];

const SERIALS_COLUMNS: DataTableColumn<SerialItem>[] = [
  {
    key: "serialNumber",
    header: "Serial #",
    cell: (row) => (
      <span className="font-mono font-semibold text-foreground">{row.serialNumber}</span>
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
        className={`text-micro px-1.5 ${SERIAL_STATUS_BADGE[row.status]}`}
      >
        {SERIAL_STATUS_LABEL[row.status]}
      </Badge>
    ),
  },
  {
    key: "currentLocationName",
    header: "Location",
    headerClassName: "hidden md:table-cell",
    className: "text-muted-foreground hidden md:table-cell",
    cell: (row) => (
      <TruncatedText
        text={row.currentLocationName ?? "—"}
        className="text-muted-foreground"
      />
    ),
  },
  {
    key: "currentLocationCode",
    header: "Bin",
    headerClassName: "hidden lg:table-cell",
    className: "font-mono text-muted-foreground hidden lg:table-cell",
    cell: (row) => <>{row.currentLocationCode ?? "—"}</>,
  },
  {
    key: "createdAt",
    header: "Created",
    headerClassName: "hidden lg:table-cell",
    className: "text-muted-foreground tabular-nums hidden lg:table-cell",
    cell: (row) => <>{formatShortDate(row.createdAt)}</>,
  },
  {
    key: "actions",
    header: "",
    cell: (row) => <SerialViewButton id={row.id} serialNumber={row.serialNumber} />,
  },
];

export function SerialsClient() {
  const canView = useCan("inventory:stock:read");
  const { fadeUp } = useMotionVariants();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isError, refetch } = useSerials({
    page,
    limit: 20,
    status: status !== "ALL" ? status : undefined,
    search: debouncedSearch.trim() || undefined,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasFilters = status !== "ALL" || search !== "";

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

  function handleClearFilters(): void {
    setSearch("");
    setStatus("ALL");
    setPage(1);
  }

  const emptyState = (
    <motion.div variants={fadeUp} initial="hidden" animate="visible">
      <InventoryEmptyState
        illustration={<EmptyProductsIllustration />}
        title="No serial numbers found"
        description={hasFilters ? undefined : "Serial numbers will appear here once items with serial tracking are received."}
        filtersActive={hasFilters}
        onClearFilters={handleClearFilters}
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
      <PageWrapper title="Serial Numbers">
        <NoPermissionState permission="inventory:stock:read" className="flex-1" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Serial Numbers"
      subtitle="Track individual serial numbers and their history."
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <SearchInput className="min-w-0 flex-1"
            placeholder="Search serial or product…"
            value={search}
            onValueChange={handleSearchChange}
          />
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[140px]")}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {SERIAL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SERIAL_STATUS_LABEL[s]}
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
            title="Failed to load serial numbers"
            description="An error occurred while fetching serial data. Please try again."
            onRetry={handleRetry}
            className="flex-1"
          />
        ) : (
          <DataTable
            data={items}
            columns={SERIALS_COLUMNS}
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
