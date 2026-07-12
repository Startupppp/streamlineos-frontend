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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorState, SkeletonTable, DataTablePagination } from "@/components/shared";
import {
  EmptyProductsIllustration,
  EmptySearchIllustration,
} from "@/components/illustrations";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useSerials } from "@/hooks/api/inventory/traceability";
import {
  SERIAL_STATUS_BADGE,
  SERIAL_STATUS_LABEL,
  type SerialStatus,
} from "@/features/inventory/lib";

const TH = "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5";

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
  const totalPages = data?.totalPages ?? 1;
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
      {isLoading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : isError ? (
        <ErrorState
          title="Failed to load serial numbers"
          description="An error occurred while fetching serial data. Please try again."
          onRetry={handleRetry}
          className="flex-1 min-h-[40vh]"
        />
      ) : items.length === 0 ? (
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
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          <motion.div variants={fadeUp}>
            <div className="rounded-md border border-border overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/80 hover:bg-muted/80">
                      <TableHead className={TH}>Serial #</TableHead>
                      <TableHead className={TH}>Product / SKU</TableHead>
                      <TableHead className={TH}>Status</TableHead>
                      <TableHead className={`${TH} hidden md:table-cell`}>Location</TableHead>
                      <TableHead className={`${TH} hidden md:table-cell`}>Warehouse</TableHead>
                      <TableHead className={`${TH} hidden lg:table-cell`}>Lot #</TableHead>
                      <TableHead className={`${TH} hidden lg:table-cell`}>Created</TableHead>
                      <TableHead className={TH} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow
                        key={item.id}
                        className="h-8 border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="px-2 py-1 font-mono text-[11px] font-semibold text-foreground">
                          {item.serialNumber}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-[11px]">
                          <span className="font-medium text-foreground block truncate max-w-[160px]">
                            {item.productName}
                          </span>
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {item.variantSku}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 ${SERIAL_STATUS_BADGE[item.status]}`}
                          >
                            {SERIAL_STATUS_LABEL[item.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden md:table-cell">
                          {item.locationName ?? "—"}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden md:table-cell">
                          {item.warehouseName ?? "—"}
                        </TableCell>
                        <TableCell className="px-2 py-1 font-mono text-[11px] text-muted-foreground hidden lg:table-cell">
                          {item.lotNumber ?? "—"}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden lg:table-cell tabular-nums">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <SerialViewButton id={item.id} serialNumber={item.serialNumber} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DataTablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={20}
              onPageChange={setPage}
            />
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  );
}
