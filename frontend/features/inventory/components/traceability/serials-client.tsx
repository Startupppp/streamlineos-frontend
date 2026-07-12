"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { EyeIcon } from "@animateicons/react/lucide";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
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
  EmptyProductsIllustration,
  EmptySearchIllustration,
} from "@/components/illustrations";
import { fadeUp } from "@/lib/motion-variants";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useSerials } from "@/hooks/api/inventory/traceability";
import {
  SERIAL_STATUS_BADGE,
  SERIAL_STATUS_LABEL,
  type SerialStatus,
} from "@/features/inventory/lib";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

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
        <span className="font-medium text-foreground block truncate max-w-[160px]">
          {row.productName}
        </span>
        <span className="text-muted-foreground font-mono text-[10px]">{row.variantSku}</span>
      </>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge
        variant="outline"
        className={`text-[10px] px-1.5 ${SERIAL_STATUS_BADGE[row.status]}`}
      >
        {SERIAL_STATUS_LABEL[row.status]}
      </Badge>
    ),
  },
  {
    key: "locationName",
    header: "Location",
    headerClassName: "hidden md:table-cell",
    className: "text-muted-foreground hidden md:table-cell",
    cell: (row) => <>{row.locationName ?? "—"}</>,
  },
  {
    key: "warehouseName",
    header: "Warehouse",
    headerClassName: "hidden md:table-cell",
    className: "text-muted-foreground hidden md:table-cell",
    cell: (row) => <>{row.warehouseName ?? "—"}</>,
  },
  {
    key: "lotNumber",
    header: "Lot #",
    headerClassName: "hidden lg:table-cell",
    className: "font-mono text-muted-foreground hidden lg:table-cell",
    cell: (row) => <>{row.lotNumber ?? "—"}</>,
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
    cell: (row) => <SerialViewButton id={row.id} serialNumber={row.serialNumber} />,
  },
];

export function SerialsClient() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useSerials({
    page,
    limit: 20,
    status: status !== "ALL" ? status : undefined,
    search: search || undefined,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasFilters = status !== "ALL" || search !== "";

  function handleRetry(): void {
    void refetch();
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleStatusChange(val: string): void {
    setStatus(val);
    setPage(1);
  }

  const emptyState = (
    <motion.div variants={fadeUp} initial="hidden" animate="visible">
      <InventoryEmptyState
        illustration={
          hasFilters ? <EmptySearchIllustration /> : <EmptyProductsIllustration />
        }
        title={hasFilters ? "No serials match your filters" : "No serial numbers found"}
        description={
          hasFilters
            ? "Try adjusting your search or filters."
            : "Serial numbers will appear here once items with serial tracking are received."
        }
        className="flex-1 min-h-[40vh]"
      />
    </motion.div>
  );

  return (
    <PageWrapper
      eyebrow="Operations · Inventory"
      title="Serial Numbers"
      subtitle="Track individual serial numbers and their history."
      filters={
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 lg:max-w-xs">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <Input
              placeholder="Search serial or product…"
              value={search}
              onChange={handleSearchChange}
              className="h-8 w-full pl-8 text-xs"
            />
          </div>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
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
      {isError ? (
        <ErrorState
          title="Failed to load serial numbers"
          description="An error occurred while fetching serial data. Please try again."
          onRetry={handleRetry}
          className="flex-1 min-h-[40vh]"
        />
      ) : (
        <DataTable
          data={items}
          columns={SERIALS_COLUMNS}
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
    </PageWrapper>
  );
}
