"use client";

import { useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { ChevronDownIcon, ChevronUpIcon } from "@animateicons/react/lucide";
import { motion } from "framer-motion";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/shared";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { fadeUp } from "@/lib/motion-variants";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useCan } from "@/hooks/api/access";
import { useLot, useUpdateLotStatus, useTraceability } from "@/hooks/api/inventory/traceability";
import { LOT_STATUS_LABEL } from "@/features/inventory/lib";
import { LotStockTable } from "./lot-stock-table";
import { MovementHistoryTable } from "./movement-history-table";
import { TraceabilityTimeline } from "./traceability-timeline";

function getExpiryClass(dateStr: string | null): string {
  if (!dateStr) return "text-muted-foreground";
  const diff = (new Date(dateStr).getTime() - Date.now()) / 86400000;
  if (diff < 0) return "text-red-600 font-semibold";
  if (diff <= 30) return "text-amber-600 font-semibold";
  return "text-foreground";
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
        ))}
      </div>
      <DataTableSkeleton rows={12} columns={3} />
      <DataTableSkeleton rows={12} columns={6} />
    </div>
  );
}

interface LotDetailClientProps {
  lotId: number;
}

export function LotDetailClient({ lotId }: LotDetailClientProps) {
  const [showTraceability, setShowTraceability] = useState(false);
  const { iconRef: traceChevronRef, hoverHandlers: traceHoverHandlers } = useAnimatedIcon();

  const { data: lot, isLoading, isError, refetch } = useLot(lotId);
  const canAdjust = useCan("inventory:stock:adjust");
  const updateStatus = useUpdateLotStatus();

  const {
    data: traceResult,
    isLoading: traceLoading,
    isFetching: traceFetching,
  } = useTraceability({ lotId: showTraceability ? lotId : undefined });

  function handleRetry(): void {
    void refetch();
  }

  function handleToggleTraceability(): void {
    setShowTraceability((prev) => !prev);
  }

  function handleBlockUnblock(): void {
    if (!lot) return;
    const nextStatus = lot.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    updateStatus.mutate({ lotId: lot.id, status: nextStatus });
  }

  if (isLoading) {
    return (
      <PageWrapper backHref="/inventory/lots" title="Loading…" eyebrow="Operations · Inventory">
        <DetailSkeleton />
      </PageWrapper>
    );
  }

  if (isError || !lot) {
    return (
      <PageWrapper backHref="/inventory/lots" title="Lot Detail" eyebrow="Operations · Inventory">
        <ErrorState
          title="Failed to load lot"
          description="Could not retrieve lot details. Please try again."
          onRetry={handleRetry}
          className="flex-1 min-h-[40vh]"
        />
      </PageWrapper>
    );
  }

  const canToggleStatus = canAdjust && (lot.status === "ACTIVE" || lot.status === "BLOCKED");
  const expiryClass = getExpiryClass(lot.expiryDate);

  return (
    <PageWrapper
      backHref="/inventory/lots"
      eyebrow="Operations · Inventory"
      title={`Lot ${lot.lotNumber}`}
      subtitle={`${lot.productName} · ${lot.variantSku}`}
      badge={LOT_STATUS_LABEL[lot.status]}
      actions={
        canToggleStatus ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleBlockUnblock}
            disabled={updateStatus.isPending}
          >
            {lot.status === "ACTIVE" ? (
              <>
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Block Lot
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                Unblock Lot
              </>
            )}
          </Button>
        ) : undefined
      }
    >
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Expiry Date
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className={`text-sm font-semibold tabular-nums ${expiryClass}`}>
                {lot.expiryDate ? new Date(lot.expiryDate).toLocaleDateString() : "No expiry"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Current Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {lot.currentStock.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Created
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {new Date(lot.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>

        <PageSection title="Stock by Location">
          <LotStockTable stockByLocation={lot.stockByLocation} />
        </PageSection>

        <PageSection title="Movement History">
          <MovementHistoryTable movements={lot.movements} />
        </PageSection>

        <PageSection
          title="Traceability"
          actions={
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleToggleTraceability}
              {...traceHoverHandlers}
            >
              {showTraceability ? (
                <>
                  <ChevronUpIcon ref={traceChevronRef} size={14} aria-hidden="true" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDownIcon ref={traceChevronRef} size={14} aria-hidden="true" />
                  View Traceability
                </>
              )}
            </Button>
          }
        >
          {showTraceability && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <TraceabilityTimeline
                  result={traceResult}
                  isLoading={traceLoading || traceFetching}
                />
              </CardContent>
            </Card>
          )}
        </PageSection>
      </motion.div>
    </PageWrapper>
  );
}
