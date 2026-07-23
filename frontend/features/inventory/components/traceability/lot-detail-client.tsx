"use client";

import { useState } from "react";
import { Unlock } from "lucide-react";
import { ChevronDownIcon, ChevronUpIcon, LockIcon } from "@animateicons/react/lucide";
import { motion } from "framer-motion";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardGrid, StatCard } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/shared";
import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";
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

interface LotDetailClientProps {
  lotId: number;
}

export function LotDetailClient({ lotId }: LotDetailClientProps) {
  const [showTraceability, setShowTraceability] = useState(false);
  const { iconRef: traceChevronRef, hoverHandlers: traceHoverHandlers } = useAnimatedIcon();
  const { iconRef: lockIconRef, hoverHandlers: lockHoverHandlers } = useAnimatedIcon();

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
      <InventoryDetailPageLoading
        title="Loading…"
        backHref="/inventory/lots"
        statCols={3}
        statCount={3}
        actions={null}
      />
    );
  }

  if (isError || !lot) {
    return (
      <PageWrapper backHref="/inventory/lots" title="Lot Detail">
        <ErrorState
          title="Failed to load lot"
          description="Could not retrieve lot details. Please try again."
          onRetry={handleRetry}
          className="flex-1 min-h-[40dvh]"
        />
      </PageWrapper>
    );
  }

  const canToggleStatus = canAdjust && (lot.status === "ACTIVE" || lot.status === "BLOCKED");
  const expiryClass = getExpiryClass(lot.expiryDate);

  return (
    <PageWrapper
      backHref="/inventory/lots"
      title={`Lot ${lot.lotNumber}`}
      subtitle={`${lot.productName} · ${lot.variantSku}`}
      badge={LOT_STATUS_LABEL[lot.status]}
      actions={
        canToggleStatus ? (
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleBlockUnblock}
            disabled={updateStatus.isPending}
            {...lockHoverHandlers}
          >
            {lot.status === "ACTIVE" ? (
              <>
                <LockIcon ref={lockIconRef} size={14} aria-hidden="true" />
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
        <StatCardGrid>
          <StatCard
            label="Expiry Date"
            value={lot.expiryDate ? new Date(lot.expiryDate).toLocaleDateString() : "No expiry"}
            tone={expiryClass.includes("red") ? "red" : expiryClass.includes("amber") ? "amber" : "default"}
          />
          <StatCard label="Current Stock" value={lot.currentStock.toLocaleString()} />
          <StatCard label="Created" value={new Date(lot.createdAt).toLocaleDateString()} />
        </StatCardGrid>

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
              className="text-xs gap-1"
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
