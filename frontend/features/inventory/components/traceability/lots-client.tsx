"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
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
  EmptyTransferIllustration,
  EmptySearchIllustration,
} from "@/components/illustrations";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useLots } from "@/hooks/api/inventory/traceability";
import {
  LOT_STATUS_BADGE,
  LOT_STATUS_LABEL,
  type LotStatus,
} from "@/features/inventory/lib";

const TH = "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5";

function getExpiryClass(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = (new Date(dateStr).getTime() - Date.now()) / 86400000;
  if (diff < 0) return "text-red-600 font-medium";
  if (diff <= 30) return "text-amber-600 font-medium";
  return "text-muted-foreground";
}

const LOT_STATUSES: LotStatus[] = ["ACTIVE", "EXPIRED", "BLOCKED", "CONSUMED", "RECALLED"];

export function LotsClient() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [expiringWithinDays, setExpiringWithinDays] = useState("ALL");

  const { data, isLoading, isError, refetch } = useLots({
    page,
    limit: 20,
    status: status !== "ALL" ? status : undefined,
    search: search || undefined,
    expiringWithinDays: expiringWithinDays !== "ALL" ? Number(expiringWithinDays) : undefined,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;
  const hasFilters = status !== "ALL" || search !== "" || expiringWithinDays !== "ALL";

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

  function handleExpiryFilterChange(val: string): void {
    setExpiringWithinDays(val);
    setPage(1);
  }

  return (
    <PageWrapper
      eyebrow="Operations · Inventory"
      title="Lots"
      subtitle="Track lot numbers, expiry dates, and stock by lot."
      filters={
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 lg:max-w-xs">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <Input
              placeholder="Search lot or product…"
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
              {LOT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {LOT_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={expiringWithinDays} onValueChange={handleExpiryFilterChange}>
            <SelectTrigger className="h-8 text-xs w-[170px]">
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
      {isLoading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : isError ? (
        <ErrorState
          title="Failed to load lots"
          description="An error occurred while fetching lot data. Please try again."
          onRetry={handleRetry}
          className="flex-1 min-h-[40vh]"
        />
      ) : items.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            illustration={
              hasFilters ? <EmptySearchIllustration /> : <EmptyTransferIllustration />
            }
            title={hasFilters ? "No lots match your filters" : "No lots found"}
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : "Lots will appear here once items are received with lot tracking enabled."
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
                      <TableHead className={TH}>Lot #</TableHead>
                      <TableHead className={TH}>Product / SKU</TableHead>
                      <TableHead className={TH}>Status</TableHead>
                      <TableHead className={`${TH} text-right`}>Stock</TableHead>
                      <TableHead className={TH}>Expiry Date</TableHead>
                      <TableHead className={`${TH} hidden md:table-cell`}>Warehouse</TableHead>
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
                          {item.lotNumber}
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
                            className={`text-[10px] px-1.5 ${LOT_STATUS_BADGE[item.status]}`}
                          >
                            {LOT_STATUS_LABEL[item.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-[11px]">
                          {item.currentStock.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={`px-2 py-1 text-[11px] tabular-nums ${getExpiryClass(item.expiryDate)}`}
                        >
                          {item.expiryDate
                            ? new Date(item.expiryDate).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden md:table-cell">
                          {item.warehouseName ?? "—"}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden lg:table-cell tabular-nums">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                            <Link
                              href={`/inventory/lots/${item.id}`}
                              aria-label={`View lot ${item.lotNumber}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
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
