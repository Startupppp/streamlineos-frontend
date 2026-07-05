"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
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
import { ErrorState, SkeletonTable } from "@/components/shared";
import { EmptyReportIllustration } from "@/components/illustrations";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useExpiryItems } from "@/hooks/api/inventory/traceability";
import { cn } from "@/lib/utils";

const TH = "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5";

const DAY_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
] as const;

function getExpiryColorClass(daysUntilExpiry: number): string {
  if (daysUntilExpiry < 0) return "text-red-600 font-semibold";
  if (daysUntilExpiry <= 30) return "text-amber-600 font-semibold";
  if (daysUntilExpiry <= 60) return "text-yellow-600 font-medium";
  return "text-muted-foreground";
}

function formatDaysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d expired`;
  if (days === 0) return "Today";
  return `${days}d`;
}

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
      {isLoading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : isError ? (
        <ErrorState
          title="Failed to load expiry data"
          description="An error occurred while fetching expiry information. Please try again."
          onRetry={handleRetry}
          className="flex-1 min-h-[40vh]"
        />
      ) : items.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            illustration={<EmptyReportIllustration />}
            title={`No stock expiring within ${days} days`}
            description="All tracked lots are within acceptable expiry windows for this period."
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
                      <TableHead className={TH}>Product</TableHead>
                      <TableHead className={`${TH} hidden md:table-cell`}>SKU</TableHead>
                      <TableHead className={TH}>Expiry Date</TableHead>
                      <TableHead className={`${TH} text-right`}>Days</TableHead>
                      <TableHead className={`${TH} text-right`}>Stock Qty</TableHead>
                      <TableHead className={`${TH} hidden md:table-cell`}>Warehouse</TableHead>
                      <TableHead className={TH} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const colorClass = getExpiryColorClass(item.daysUntilExpiry);
                      return (
                        <TableRow
                          key={item.lotId}
                          className={cn(
                            "h-8 border-b border-border/50 transition-colors",
                            item.daysUntilExpiry < 0 && "bg-red-50/40 hover:bg-red-50/60",
                            item.daysUntilExpiry >= 0 &&
                              item.daysUntilExpiry <= 30 &&
                              "bg-amber-50/30 hover:bg-amber-50/50",
                            item.daysUntilExpiry > 30 && "hover:bg-muted/30",
                          )}
                        >
                          <TableCell className="px-2 py-1 font-mono text-[11px] font-semibold text-foreground">
                            {item.lotNumber}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-[11px] font-medium text-foreground truncate max-w-[160px]">
                            {item.productName}
                          </TableCell>
                          <TableCell className="px-2 py-1 font-mono text-[11px] text-muted-foreground hidden md:table-cell">
                            {item.variantSku}
                          </TableCell>
                          <TableCell className={`px-2 py-1 text-[11px] tabular-nums ${colorClass}`}>
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell
                            className={`px-2 py-1 text-right tabular-nums text-[11px] ${colorClass}`}
                          >
                            {formatDaysLabel(item.daysUntilExpiry)}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-[11px]">
                            {item.currentStock.toLocaleString()}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden md:table-cell">
                            {item.warehouseName ?? "—"}
                          </TableCell>
                          <TableCell className="px-2 py-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                              <Link
                                href={`/inventory/lots/${item.lotId}`}
                                aria-label={`View lot ${item.lotNumber}`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  );
}
